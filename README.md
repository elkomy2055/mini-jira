<img width="5118" height="3340" alt="Blank diagram" src="https://github.com/user-attachments/assets/5233d9cd-7330-4c84-8e48-3d3dd960e802" />

# Mini-Jira on AWS

> Lightweight team task-management app built on AWS for GIU Cloud Computing 2026

## 🔗 Live App

**CloudFront URL:** `https://dmdfoo8zqrinp.cloudfront.net`
demo video=https://drive.google.com/file/d/1EtnRd2Q9dcBq4k-TMicSNZOmeg3Ku9rs/view?usp=sharing
---

## 🏗️ Architecture

```
Internet
   │
   ▼
CloudFront (CDN + HTTPS)
   │
   ├──► S3 (Static React Build)
   │
   └──► Application Load Balancer
              │
         ┌────┴─────┐
         │          │
      EC2 AZ-1   EC2 AZ-2   (Auto Scaling Group, private subnets)
      Node.js    Node.js
         │
         ├── DynamoDB (Tables: Users, Teams, Projects, Tasks, Comments, AuditLogs)
         ├── S3 Originals Bucket  ──► Lambda (Image Resize) ──► S3 Resized Bucket
         ├── Cognito (Auth)
         └── SNS ──► SQS ──► Lambda (Assignment Worker) ──► CloudWatch Metrics
                  └──► Email Subscription

EventBridge (9 AM daily) ──► Lambda (Daily Digest) ──► SNS ──► Email
```

### AWS Services Used

| Service | Role |
|---------|------|
| **EC2 + Auto Scaling** | Node.js backend across 2 AZs |
| **Application Load Balancer** | Traffic distribution + health checks |
| **CloudFront** | CDN for app and static assets |
| **DynamoDB** | All application data with GSIs |
| **S3 (originals)** | Task image attachments |
| **S3 (resized)** | Thumbnails from Lambda |
| **Lambda – Image Resize** | Triggered on S3 PUT, resizes images |
| **Lambda – Assignment Worker** | Drains SQS, logs activity, publishes metrics |
| **Lambda – Daily Digest** | EventBridge trigger, sends due-task emails |
| **SNS** | Fan-out: email + SQS for task assignments |
| **SQS** | Decouples assignment events |
| **EventBridge** | Cron rule at 9:00 AM |
| **Cognito** | User pool, JWT auth, roles + teamId |
| **CloudWatch** | Metrics, dashboard, alarms |
| **IAM** | Least-privilege roles |
| **VPC** | Public ALB subnets, private EC2 subnets, NAT gateway |

---

## 🚀 Deployment Guide

### Prerequisites
- AWS CLI configured (`aws configure`)
- Node.js 18+
- An AWS account with Free Tier

---

### Step 1: Cognito User Pool

1. Go to **Cognito → Create user pool**
2. Sign-in: **Email**
3. Add custom attributes:
   - `custom:role` (String, mutable)
   - `custom:teamId` (String, mutable)
4. App client: **Public client**, enable `USER_PASSWORD_AUTH`
5. Note your **User Pool ID** and **Client ID**

---

### Step 2: DynamoDB Tables

```bash
cd backend
cp .env.example .env
# Fill in COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, AWS_REGION
npm install
node src/config/createTables.js
```

This creates all 6 tables with the required GSIs.

---

### Step 3: S3 Buckets

```bash
# Originals bucket
aws s3 mb s3://mini-jira-originals --region us-east-1

# Resized bucket  
aws s3 mb s3://mini-jira-resized --region us-east-1

# Configure CORS on originals bucket (for direct uploads)
aws s3api put-bucket-cors --bucket mini-jira-originals --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET","PUT","POST","DELETE"],
    "AllowedOrigins": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
```

---

### Step 4: SNS Topics

```bash
# Task assignment topic (fan-out)
aws sns create-topic --name MiniJira-TaskAssignment

# Alerts topic (daily digest + alarms)
aws sns create-topic --name MiniJira-Alerts

# Subscribe your email for notifications
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:MiniJira-Alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

### Step 5: SQS Queue

```bash
aws sqs create-queue --queue-name MiniJira-AssignmentQueue

# Subscribe SQS to SNS topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:MiniJira-TaskAssignment \
  --protocol sqs \
  --notification-endpoint arn:aws:sqs:us-east-1:ACCOUNT_ID:MiniJira-AssignmentQueue
```

---

### Step 6: Lambda Functions

#### 6a. Image Resize Lambda

```bash
cd backend/src/lambdas
mkdir image-resize-lambda && cd image-resize-lambda
cp ../imageResize.js index.js
npm init -y && npm install @aws-sdk/client-s3 sharp
zip -r function.zip .

aws lambda create-function \
  --function-name MiniJira-ImageResize \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaS3Role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --environment Variables="{S3_RESIZED_BUCKET=mini-jira-resized}"

# Add S3 trigger
aws lambda add-permission \
  --function-name MiniJira-ImageResize \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::mini-jira-originals

aws s3api put-bucket-notification-configuration \
  --bucket mini-jira-originals \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:MiniJira-ImageResize",
      "Events": ["s3:ObjectCreated:Put"]
    }]
  }'
```

#### 6b. Assignment Worker Lambda

```bash
cd ../assignment-worker
cp ../assignmentWorker.js index.js
npm init -y && npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-cloudwatch uuid
zip -r function.zip .

aws lambda create-function \
  --function-name MiniJira-AssignmentWorker \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaFullRole \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --environment Variables="{DYNAMO_AUDIT_TABLE=MiniJira-AuditLogs}"

# Trigger from SQS
aws lambda create-event-source-mapping \
  --function-name MiniJira-AssignmentWorker \
  --event-source-arn arn:aws:sqs:us-east-1:ACCOUNT_ID:MiniJira-AssignmentQueue \
  --batch-size 10
```

#### 6c. Daily Digest Lambda

```bash
cd ../daily-digest
cp ../dailyDigest.js index.js
npm init -y && npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-sns
zip -r function.zip .

aws lambda create-function \
  --function-name MiniJira-DailyDigest \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/LambdaFullRole \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --environment Variables="{DYNAMO_TASKS_TABLE=MiniJira-Tasks,DYNAMO_USERS_TABLE=MiniJira-Users,SNS_ALERTS_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:MiniJira-Alerts}"

# EventBridge rule: 9 AM daily
aws events put-rule \
  --name MiniJira-DailyDigestRule \
  --schedule-expression "cron(0 9 * * ? *)" \
  --state ENABLED

aws lambda add-permission \
  --function-name MiniJira-DailyDigest \
  --statement-id eventbridge-trigger \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com

aws events put-targets \
  --rule MiniJira-DailyDigestRule \
  --targets "Id=DailyDigest,Arn=arn:aws:lambda:us-east-1:ACCOUNT_ID:function:MiniJira-DailyDigest"
```

---

### Step 7: VPC Setup

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create 2 public subnets (for ALB)
aws ec2 create-subnet --vpc-id VPC_ID --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id VPC_ID --cidr-block 10.0.2.0/24 --availability-zone us-east-1b

# Create 2 private subnets (for EC2)
aws ec2 create-subnet --vpc-id VPC_ID --cidr-block 10.0.3.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id VPC_ID --cidr-block 10.0.4.0/24 --availability-zone us-east-1b

# Internet Gateway + NAT Gateway for outbound traffic from private subnets
```

---

### Step 8: EC2 + Launch Template + Auto Scaling

**User Data script for EC2 instances:**

```bash
#!/bin/bash
yum update -y
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs git

# Clone your repo
git clone https://github.com/YOUR_USERNAME/mini-jira.git /home/ec2-user/mini-jira
cd /home/ec2-user/mini-jira/backend

# Create .env
cat > .env << 'EOF'
PORT=5000
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=YOUR_POOL_ID
COGNITO_CLIENT_ID=YOUR_CLIENT_ID
DYNAMO_USERS_TABLE=MiniJira-Users
DYNAMO_TEAMS_TABLE=MiniJira-Teams
DYNAMO_PROJECTS_TABLE=MiniJira-Projects
DYNAMO_TASKS_TABLE=MiniJira-Tasks
DYNAMO_COMMENTS_TABLE=MiniJira-Comments
DYNAMO_AUDIT_TABLE=MiniJira-AuditLogs
S3_ORIGINALS_BUCKET=mini-jira-originals
S3_RESIZED_BUCKET=mini-jira-resized
SNS_TASK_ASSIGNMENT_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:MiniJira-TaskAssignment
SNS_ALERTS_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:MiniJira-Alerts
SQS_ASSIGNMENT_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/MiniJira-AssignmentQueue
FRONTEND_URL=https://YOUR_CLOUDFRONT_ID.cloudfront.net
EOF

npm install
npm start &
```

**Create Auto Scaling Group:**
- Min: 2, Max: 4, Desired: 2
- Across both private subnets (AZ-1a and AZ-1b)
- Target tracking: CPU at 60%

---

### Step 9: Application Load Balancer

1. Create ALB in **public subnets** across both AZs
2. Target group: HTTP port 5000, health check `/health`
3. Register EC2 instances (or let ASG handle it)
4. Security group: allow port 80 inbound

---

### Step 10: Frontend Build + S3 + CloudFront

```bash
cd frontend
cp .env.example .env
# Fill in REACT_APP_API_URL with your ALB DNS
# e.g. REACT_APP_API_URL=http://your-alb-123.us-east-1.elb.amazonaws.com/api

npm install
npm run build

# Deploy static files to S3
aws s3 mb s3://mini-jira-frontend
aws s3 sync build/ s3://mini-jira-frontend --acl public-read

# Create CloudFront distribution pointing to:
# - S3 (for static assets, index.html)
# - ALB (for /api/* path)
```

**CloudFront Behaviors:**
- `/api/*` → Forward to ALB (HTTP origin)
- `/*` → Forward to S3 (index.html for SPA routing)

---

### Step 11: CloudWatch Dashboard

Create dashboard with these widgets:

```bash
aws cloudwatch put-dashboard --dashboard-name MiniJira --dashboard-body '{
  "widgets": [
    {"type":"metric","properties":{"title":"Tasks Created Per Day","metrics":[["MiniJira","TasksCreated"]],"period":86400,"stat":"Sum"}},
    {"type":"metric","properties":{"title":"Tasks Closed Per Team","metrics":[["MiniJira","TasksClosed"]],"period":86400,"stat":"Sum"}},
    {"type":"metric","properties":{"title":"Tasks Assigned Per Team","metrics":[["MiniJira","TasksAssignedPerTeam"]],"period":86400,"stat":"Sum"}},
    {"type":"metric","properties":{"title":"EC2 CPU Utilization","metrics":[["AWS/EC2","CPUUtilization"]],"period":300,"stat":"Average"}}
  ]
}'
```

**CloudWatch Alarm:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name MiniJira-OverdueTasks \
  --metric-name TasksCreated \
  --namespace MiniJira \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:MiniJira-Alerts
```

---

### Step 12: Seed Demo Users

After deployment, create the demo accounts via the Users page (Manager login) or use:

```bash
# First login as the admin you create manually in Cognito console
# Then use the /api/auth/register endpoint to create:
# - Manager Ali: ali@company.com / Pass@123 / role: manager
# - Employee Sara: sara@company.com / Pass@123 / role: employee / team: Frontend
# - Employee Omar: omar@company.com / Pass@123 / role: employee / team: Backend
```

---

## 🔐 IAM Roles Needed

**EC2 Role** (attach to instance profile):
- `AmazonDynamoDBFullAccess`
- `AmazonS3FullAccess`
- `AmazonSNSFullAccess`
- `AmazonSQSFullAccess`
- `CloudWatchFullAccess`
- `AmazonCognitoPowerUser`

**Lambda Roles** — least privilege per function:
- Image Resize: S3 read (originals) + S3 write (resized)
- Assignment Worker: DynamoDB write (AuditLogs) + CloudWatch PutMetricData
- Daily Digest: DynamoDB scan (Tasks, Users) + SNS publish

---

## 🧪 Demo Scenario

1. Login as **Ali** (manager) → Create Task A → assign to Sara (Frontend)
2. Login as **Ali** → Create Task B → assign to Omar (Backend)
3. Login as **Sara** → Board shows only Task A ✓
4. Login as **Omar** → Board shows only Task B ✓
5. Login as **Ali** → Board shows both tasks, filter by team works ✓

---

## 📁 Project Structure

```
mini-jira/
├── backend/
│   ├── src/
│   │   ├── config/       # AWS clients, constants, DynamoDB setup
│   │   ├── middleware/   # JWT auth, role guards
│   │   ├── routes/       # Express routes (tasks, projects, teams, auth)
│   │   ├── services/     # Business logic (task, project, comment, user, s3)
│   │   ├── lambdas/      # Lambda function code
│   │   └── index.js      # Express server
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/   # Sidebar, TaskModal, CreateTaskModal
    │   ├── context/      # Zustand auth store
    │   ├── pages/        # Board, Tasks, Projects, Teams, Users, Login
    │   └── utils/        # Axios API client
    └── package.json
```
