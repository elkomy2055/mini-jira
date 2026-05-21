const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
  AdminGetUserCommand,
  ListUsersCommand,
  InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { PutCommand, GetCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/aws");
const { TABLES, COGNITO } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");

const cognitoClient = new CognitoIdentityProviderClient({ region: COGNITO.REGION });

async function createUser(data) {
  // Create in Cognito
  await cognitoClient.send(new AdminCreateUserCommand({
    UserPoolId: COGNITO.USER_POOL_ID,
    Username: data.email,
    TemporaryPassword: data.password,
    MessageAction: "SUPPRESS",
    UserAttributes: [
      { Name: "email", Value: data.email },
      { Name: "email_verified", Value: "true" },
      { Name: "custom:role", Value: data.role || "employee" },
      { Name: "custom:teamId", Value: data.teamId || "" },
      { Name: "name", Value: data.name || data.email },
    ],
  }));

  // Set permanent password
  await cognitoClient.send(new AdminSetUserPasswordCommand({
    UserPoolId: COGNITO.USER_POOL_ID,
    Username: data.email,
    Password: data.password,
    Permanent: true,
  }));

  // Also store in DynamoDB for quick lookups
  const user = {
    userId: uuidv4(),
    email: data.email,
    name: data.name || data.email,
    role: data.role || "employee",
    teamId: data.teamId || null,
    teamName: data.teamName || null,
    createdAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: TABLES.USERS, Item: user }));
  return user;
}

async function getUserById(userId) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLES.USERS, Key: { userId } }));
  return Item || null;
}

async function getAllUsers() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLES.USERS }));
  return Items || [];
}

async function getUsersByTeam(teamId) {
  const { Items } = await docClient.send(new ScanCommand({
    TableName: TABLES.USERS,
    FilterExpression: "teamId = :teamId",
    ExpressionAttributeValues: { ":teamId": teamId },
  }));
  return Items || [];
}

async function login(email, password) {
  const result = await cognitoClient.send(new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: COGNITO.CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  }));
  return result.AuthenticationResult;
}

async function updateUserTeam(userId, teamId, teamName) {
  await docClient.send(new UpdateCommand({
    TableName: TABLES.USERS,
    Key: { userId },
    UpdateExpression: "SET teamId = :teamId, teamName = :teamName",
    ExpressionAttributeValues: { ":teamId": teamId, ":teamName": teamName },
  }));
}

module.exports = { createUser, getUserById, getAllUsers, getUsersByTeam, login, updateUserTeam };
