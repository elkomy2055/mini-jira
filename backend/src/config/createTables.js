require("dotenv").config();
const { DynamoDBClient, CreateTableCommand, ListTablesCommand } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });

const tables = [
  {
    TableName: process.env.DYNAMO_USERS_TABLE || "MiniJira-Users",
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "email-index",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMO_TEAMS_TABLE || "MiniJira-Teams",
    KeySchema: [{ AttributeName: "teamId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "teamId", AttributeType: "S" }],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMO_PROJECTS_TABLE || "MiniJira-Projects",
    KeySchema: [{ AttributeName: "projectId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "projectId", AttributeType: "S" }],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMO_TASKS_TABLE || "MiniJira-Tasks",
    KeySchema: [{ AttributeName: "taskId", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "taskId", AttributeType: "S" },
      { AttributeName: "teamId", AttributeType: "S" },
      { AttributeName: "assigneeId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "teamId-index",
        KeySchema: [{ AttributeName: "teamId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: "assigneeId-index",
        KeySchema: [{ AttributeName: "assigneeId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMO_COMMENTS_TABLE || "MiniJira-Comments",
    KeySchema: [
      { AttributeName: "commentId", KeyType: "HASH" },
      { AttributeName: "taskId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "commentId", AttributeType: "S" },
      { AttributeName: "taskId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "taskId-index",
        KeySchema: [{ AttributeName: "taskId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
  {
    TableName: process.env.DYNAMO_AUDIT_TABLE || "MiniJira-AuditLogs",
    KeySchema: [
      { AttributeName: "logId", KeyType: "HASH" },
      { AttributeName: "taskId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "logId", AttributeType: "S" },
      { AttributeName: "taskId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "taskId-index",
        KeySchema: [{ AttributeName: "taskId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
  },
];

async function createTables() {
  const { TableNames: existing } = await client.send(new ListTablesCommand({}));

  for (const table of tables) {
    if (existing.includes(table.TableName)) {
      console.log(`Table already exists: ${table.TableName}`);
      continue;
    }
    try {
      await client.send(new CreateTableCommand(table));
      console.log(`Created table: ${table.TableName}`);
    } catch (err) {
      console.error(`Failed to create ${table.TableName}:`, err.message);
    }
  }
  console.log("Done.");
}

createTables();
