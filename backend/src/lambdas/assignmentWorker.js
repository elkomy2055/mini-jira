// Lambda: assignment-worker
// Drains SQS queue for task assignment events
// Writes activity logs to DynamoDB and publishes CloudWatch custom metrics

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { CloudWatchClient, PutMetricDataCommand } = require("@aws-sdk/client-cloudwatch");
const { v4: uuidv4 } = require("uuid");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cw = new CloudWatchClient({});

const AUDIT_TABLE = process.env.DYNAMO_AUDIT_TABLE || "MiniJira-AuditLogs";

exports.handler = async (event) => {
  for (const record of event.Records) {
    let body;
    try {
      // SQS message body is the SNS notification JSON
      const snsWrapper = JSON.parse(record.body);
      body = typeof snsWrapper.Message === "string"
        ? JSON.parse(snsWrapper.Message)
        : snsWrapper;
    } catch (err) {
      console.error("Failed to parse SQS message:", err);
      continue;
    }

    if (body.eventType !== "TASK_ASSIGNED") continue;

    // Write activity log to DynamoDB
    try {
      await dynamo.send(new PutCommand({
        TableName: AUDIT_TABLE,
        Item: {
          logId: uuidv4(),
          taskId: body.taskId,
          oldStatus: null,
          newStatus: "assigned",
          changedBy: body.assignedBy,
          changedByName: "Manager",
          changedAt: new Date().toISOString(),
          eventType: "TASK_ASSIGNED",
          teamId: body.teamId,
          assigneeId: body.assigneeId,
        },
      }));
      console.log(`Activity log written for task ${body.taskId}`);
    } catch (err) {
      console.error("DynamoDB write error:", err);
    }

    // Publish CloudWatch custom metric: TasksAssignedPerTeam
    try {
      await cw.send(new PutMetricDataCommand({
        Namespace: "MiniJira",
        MetricData: [{
          MetricName: "TasksAssignedPerTeam",
          Value: 1,
          Unit: "Count",
          Dimensions: [
            { Name: "TeamId", Value: body.teamId || "unknown" },
            { Name: "TeamName", Value: body.teamName || "unknown" },
          ],
          Timestamp: new Date(),
        }],
      }));
      console.log(`CloudWatch metric published for team ${body.teamId}`);
    } catch (err) {
      console.error("CloudWatch metric error:", err);
    }
  }

  return { statusCode: 200, body: "Processed" };
};
