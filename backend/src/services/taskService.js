const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, snsClient, cwClient } = require("../config/aws");
const { TABLES, BUCKETS, SNS, ROLES, TASK_STATUS } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");
const { PublishCommand } = require("@aws-sdk/client-sns");
const { PutMetricDataCommand } = require("@aws-sdk/client-cloudwatch");
const s3Service = require("./s3Service");

async function createTask(taskData, createdBy) {
  const taskId = uuidv4();
  const now = new Date().toISOString();

  const task = {
    taskId,
    title: taskData.title,
    description: taskData.description || "",
    status: TASK_STATUS.TODO,
    priority: taskData.priority || "Medium",
    deadline: taskData.deadline || null,
    assigneeId: taskData.assigneeId,
    assigneeName: taskData.assigneeName || "",
    teamId: taskData.teamId,
    teamName: taskData.teamName || "",
    projectId: taskData.projectId || null,
    imageKey: taskData.imageKey || null,
    resizedImageKey: taskData.resizedImageKey || null,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLES.TASKS, Item: task }));

  // Publish assignment event to SNS
  if (taskData.assigneeId) {
    try {
      await snsClient.send(new PublishCommand({
        TopicArn: SNS.TASK_ASSIGNMENT_TOPIC,
        Subject: `New Task Assigned: ${task.title}`,
        Message: JSON.stringify({
          eventType: "TASK_ASSIGNED",
          taskId,
          taskTitle: task.title,
          assigneeId: task.assigneeId,
          assigneeName: task.assigneeName,
          assigneeEmail: taskData.assigneeEmail || "",
          teamId: task.teamId,
          teamName: task.teamName,
          priority: task.priority,
          deadline: task.deadline,
          assignedBy: createdBy,
        }),
        MessageAttributes: {
          eventType: { DataType: "String", StringValue: "TASK_ASSIGNED" },
        },
      }));
    } catch (err) {
      console.error("SNS publish error:", err.message);
    }
  }

  // Publish CloudWatch metric
  try {
    await cwClient.send(new PutMetricDataCommand({
      Namespace: "MiniJira",
      MetricData: [{
        MetricName: "TasksCreated",
        Value: 1,
        Unit: "Count",
        Dimensions: [{ Name: "TeamId", Value: task.teamId }],
      }],
    }));
  } catch (err) {
    console.error("CloudWatch metric error:", err.message);
  }

  return task;
}

async function getTask(taskId, requestingUser) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLES.TASKS, Key: { taskId } }));
  if (!Item) return null;

  // Team isolation: employees can only see their own team's tasks
  if (requestingUser.role === ROLES.EMPLOYEE && Item.teamId !== requestingUser.teamId) {
    return null;
  }

  return Item;
}

async function getTasksByTeam(teamId) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLES.TASKS,
    IndexName: "teamId-index",
    KeyConditionExpression: "teamId = :teamId",
    ExpressionAttributeValues: { ":teamId": teamId },
  }));
  return Items || [];
}

async function getAllTasks(filters = {}) {
  let params = { TableName: TABLES.TASKS };

  if (filters.teamId) {
    params = {
      ...params,
      IndexName: "teamId-index",
      KeyConditionExpression: "teamId = :teamId",
      ExpressionAttributeValues: { ":teamId": filters.teamId },
    };
    const { Items } = await docClient.send(new QueryCommand(params));
    return Items || [];
  }

  const { Items } = await docClient.send(new ScanCommand(params));
  return Items || [];
}

async function getTasksByAssignee(assigneeId) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLES.TASKS,
    IndexName: "assigneeId-index",
    KeyConditionExpression: "assigneeId = :assigneeId",
    ExpressionAttributeValues: { ":assigneeId": assigneeId },
  }));
  return Items || [];
}

async function updateTask(taskId, updates, requestingUser) {
  const existing = await getTask(taskId, requestingUser);
  if (!existing) return null;

  const now = new Date().toISOString();
  const oldStatus = existing.status;
  const newStatus = updates.status || oldStatus;

  let updateExpr = "SET updatedAt = :updatedAt";
  const exprValues = { ":updatedAt": now };
  const exprNames = {};

  const allowedFields = ["title", "description", "priority", "deadline", "assigneeId", "assigneeName", "teamId", "teamName", "status", "imageKey", "resizedImageKey", "projectId"];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateExpr += `, #${field} = :${field}`;
      exprValues[`:${field}`] = updates[field];
      exprNames[`#${field}`] = field;
    }
  }

  await docClient.send(new UpdateCommand({
    TableName: TABLES.TASKS,
    Key: { taskId },
    UpdateExpression: updateExpr,
    ExpressionAttributeValues: exprValues,
    ExpressionAttributeNames: Object.keys(exprNames).length ? exprNames : undefined,
  }));

  // Write audit log if status changed
  if (newStatus !== oldStatus) {
    await writeAuditLog(taskId, oldStatus, newStatus, requestingUser);

    // CloudWatch metric for task closure
    if (newStatus === TASK_STATUS.DONE) {
      try {
        await cwClient.send(new PutMetricDataCommand({
          Namespace: "MiniJira",
          MetricData: [{
            MetricName: "TasksClosed",
            Value: 1,
            Unit: "Count",
            Dimensions: [{ Name: "TeamId", Value: existing.teamId }],
          }],
        }));
      } catch (err) {
        console.error("CloudWatch metric error:", err.message);
      }
    }
  }

  return { ...existing, ...updates, updatedAt: now };
}

async function deleteTask(taskId, requestingUser) {
  const existing = await getTask(taskId, requestingUser);
  if (!existing) return false;

  // Delete associated image from S3 if exists
  if (existing.imageKey) {
    await s3Service.deleteObject(BUCKETS.ORIGINALS, existing.imageKey);
  }
  if (existing.resizedImageKey) {
    await s3Service.deleteObject(BUCKETS.RESIZED, existing.resizedImageKey);
  }

  await docClient.send(new DeleteCommand({ TableName: TABLES.TASKS, Key: { taskId } }));
  return true;
}

async function writeAuditLog(taskId, oldStatus, newStatus, user) {
  await docClient.send(new PutCommand({
    TableName: TABLES.AUDIT_LOGS,
    Item: {
      logId: uuidv4(),
      taskId,
      oldStatus,
      newStatus,
      changedBy: user.sub,
      changedByName: user.username || user.email,
      changedAt: new Date().toISOString(),
    },
  }));
}

async function getAuditLogs(taskId) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLES.AUDIT_LOGS,
    IndexName: "taskId-index",
    KeyConditionExpression: "taskId = :taskId",
    ExpressionAttributeValues: { ":taskId": taskId },
  }));
  return (Items || []).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
}

module.exports = { createTask, getTask, getTasksByTeam, getAllTasks, getTasksByAssignee, updateTask, deleteTask, getAuditLogs };
