const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/aws");
const { TABLES } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");

async function createTeam(data) {
  const team = {
    teamId: uuidv4(),
    name: data.name,
    description: data.description || "",
    createdAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: TABLES.TEAMS, Item: team }));
  return team;
}

async function getTeam(teamId) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLES.TEAMS, Key: { teamId } }));
  return Item || null;
}

async function getAllTeams() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLES.TEAMS }));
  return Items || [];
}

async function updateTeam(teamId, updates) {
  const now = new Date().toISOString();
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLES.TEAMS,
    Key: { teamId },
    UpdateExpression: "SET #name = :name, description = :desc, updatedAt = :now",
    ExpressionAttributeNames: { "#name": "name" },
    ExpressionAttributeValues: {
      ":name": updates.name,
      ":desc": updates.description || "",
      ":now": now,
    },
    ReturnValues: "ALL_NEW",
  }));
  return result.Attributes;
}

async function deleteTeam(teamId) {
  await docClient.send(new DeleteCommand({ TableName: TABLES.TEAMS, Key: { teamId } }));
  return true;
}

module.exports = { createTeam, getTeam, getAllTeams, updateTeam, deleteTeam };
