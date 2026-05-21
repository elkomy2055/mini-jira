const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/aws");
const { TABLES } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");

async function createProject(data, createdBy) {
  const project = {
    projectId: uuidv4(),
    name: data.name,
    description: data.description || "",
    teamIds: data.teamIds || [],
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: TABLES.PROJECTS, Item: project }));
  return project;
}

async function getProject(projectId) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLES.PROJECTS, Key: { projectId } }));
  return Item || null;
}

async function getAllProjects() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLES.PROJECTS }));
  return Items || [];
}

async function updateProject(projectId, updates) {
  const now = new Date().toISOString();
  let updateExpr = "SET updatedAt = :updatedAt";
  const exprValues = { ":updatedAt": now };
  const exprNames = {};

  for (const field of ["name", "description", "teamIds"]) {
    if (updates[field] !== undefined) {
      updateExpr += `, #${field} = :${field}`;
      exprValues[`:${field}`] = updates[field];
      exprNames[`#${field}`] = field;
    }
  }

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.PROJECTS,
    Key: { projectId },
    UpdateExpression: updateExpr,
    ExpressionAttributeValues: exprValues,
    ExpressionAttributeNames: Object.keys(exprNames).length ? exprNames : undefined,
    ReturnValues: "ALL_NEW",
  }));
  return result.Attributes;
}

async function deleteProject(projectId) {
  await docClient.send(new DeleteCommand({ TableName: TABLES.PROJECTS, Key: { projectId } }));
  return true;
}

module.exports = { createProject, getProject, getAllProjects, updateProject, deleteProject };
