module.exports = {
  TABLES: {
    USERS: process.env.DYNAMO_USERS_TABLE || "MiniJira-Users",
    TEAMS: process.env.DYNAMO_TEAMS_TABLE || "MiniJira-Teams",
    PROJECTS: process.env.DYNAMO_PROJECTS_TABLE || "MiniJira-Projects",
    TASKS: process.env.DYNAMO_TASKS_TABLE || "MiniJira-Tasks",
    COMMENTS: process.env.DYNAMO_COMMENTS_TABLE || "MiniJira-Comments",
    AUDIT_LOGS: process.env.DYNAMO_AUDIT_TABLE || "MiniJira-AuditLogs",
  },
  BUCKETS: {
    ORIGINALS: process.env.S3_ORIGINALS_BUCKET || "mini-jira-originals",
    RESIZED: process.env.S3_RESIZED_BUCKET || "mini-jira-resized",
  },
  SNS: {
    TASK_ASSIGNMENT_TOPIC: process.env.SNS_TASK_ASSIGNMENT_TOPIC_ARN || "",
    ALERTS_TOPIC: process.env.SNS_ALERTS_TOPIC_ARN || "",
  },
  SQS: {
    ASSIGNMENT_QUEUE: process.env.SQS_ASSIGNMENT_QUEUE_URL || "",
  },
  COGNITO: {
    USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || "",
    CLIENT_ID: process.env.COGNITO_CLIENT_ID || "",
    REGION: process.env.AWS_REGION || "us-east-1",
  },
  ROLES: {
    MANAGER: "manager",
    EMPLOYEE: "employee",
    ADMIN: "admin",
  },
  TASK_STATUS: {
    TODO: "To Do",
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    DONE: "Done",
  },
  TASK_PRIORITY: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  },
};
