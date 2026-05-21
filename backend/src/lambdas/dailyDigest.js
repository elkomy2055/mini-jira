// Lambda: daily-digest
// Triggered by EventBridge at 9:00 AM daily
// Scans Tasks table for tasks due today, sends digest via SNS

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

const TASKS_TABLE = process.env.DYNAMO_TASKS_TABLE || "MiniJira-Tasks";
const USERS_TABLE = process.env.DYNAMO_USERS_TABLE || "MiniJira-Users";
const SNS_TOPIC_ARN = process.env.SNS_ALERTS_TOPIC_ARN || "";

exports.handler = async () => {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Scan for tasks due today that are not Done
  const { Items: tasks } = await dynamo.send(new ScanCommand({
    TableName: TASKS_TABLE,
    FilterExpression: "begins_with(deadline, :today) AND #s <> :done",
    ExpressionAttributeValues: { ":today": today, ":done": "Done" },
    ExpressionAttributeNames: { "#s": "status" },
  }));

  if (!tasks || tasks.length === 0) {
    console.log("No tasks due today.");
    return { statusCode: 200, body: "No tasks due today" };
  }

  // Group tasks by assignee
  const byAssignee = {};
  for (const task of tasks) {
    if (!byAssignee[task.assigneeId]) byAssignee[task.assigneeId] = [];
    byAssignee[task.assigneeId].push(task);
  }

  // Fetch all users
  const { Items: users } = await dynamo.send(new ScanCommand({ TableName: USERS_TABLE }));
  const userMap = Object.fromEntries((users || []).map((u) => [u.userId, u]));

  let sent = 0;
  for (const [assigneeId, assigneeTasks] of Object.entries(byAssignee)) {
    const user = userMap[assigneeId];
    const email = user?.email || "unknown";
    const name = user?.name || assigneeId;

    const taskList = assigneeTasks
      .map((t) => `  - [${t.priority}] ${t.title} (${t.status}) — Team: ${t.teamName}`)
      .join("\n");

    const message = `Hi ${name},\n\nYou have ${assigneeTasks.length} task(s) due today (${today}):\n\n${taskList}\n\nPlease log in to Mini-Jira to update your tasks.\n\n— Mini-Jira Bot`;

    try {
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: `[Mini-Jira] Your Daily Digest — ${assigneeTasks.length} task(s) due today`,
        Message: message,
        MessageAttributes: {
          email: { DataType: "String", StringValue: email },
        },
      }));
      sent++;
      console.log(`Digest sent to ${email}`);
    } catch (err) {
      console.error(`Failed to send digest to ${email}:`, err.message);
    }
  }

  return { statusCode: 200, body: `Sent ${sent} digest email(s)` };
};
