#!/bin/bash
# EC2 User Data script for Mini-Jira backend
# Run this as user data when launching EC2 instances

set -e
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

# Install PM2 for process management
npm install -g pm2

# Clone the repo (replace with your GitHub URL)
git clone https://github.com/YOUR_USERNAME/mini-jira.git /home/ec2-user/mini-jira
cd /home/ec2-user/mini-jira/backend

# Create .env from environment (fill in values before creating AMI or use SSM Parameter Store)
cat > .env << 'EOF'
PORT=5000
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=REPLACE_ME
COGNITO_CLIENT_ID=REPLACE_ME
DYNAMO_USERS_TABLE=MiniJira-Users
DYNAMO_TEAMS_TABLE=MiniJira-Teams
DYNAMO_PROJECTS_TABLE=MiniJira-Projects
DYNAMO_TASKS_TABLE=MiniJira-Tasks
DYNAMO_COMMENTS_TABLE=MiniJira-Comments
DYNAMO_AUDIT_TABLE=MiniJira-AuditLogs
S3_ORIGINALS_BUCKET=mini-jira-originals
S3_RESIZED_BUCKET=mini-jira-resized
SNS_TASK_ASSIGNMENT_TOPIC_ARN=REPLACE_ME
SNS_ALERTS_TOPIC_ARN=REPLACE_ME
SQS_ASSIGNMENT_QUEUE_URL=REPLACE_ME
FRONTEND_URL=REPLACE_ME
EOF

npm install

# Start with PM2
pm2 start src/index.js --name mini-jira-backend
pm2 startup systemd -u ec2-user --hp /home/ec2-user
pm2 save

echo "Mini-Jira backend started on port 5000"
