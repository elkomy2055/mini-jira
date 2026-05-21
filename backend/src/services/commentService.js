const { PutCommand, DeleteCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/aws");
const { TABLES } = require("../config/constants");
const { v4: uuidv4 } = require("uuid");

async function createComment(taskId, content, user) {
  const comment = {
    commentId: uuidv4(),
    taskId,
    content,
    authorId: user.sub,
    authorName: user.username || user.email,
    createdAt: new Date().toISOString(),
  };
  await docClient.send(new PutCommand({ TableName: TABLES.COMMENTS, Item: comment }));
  return comment;
}

async function getCommentsByTask(taskId) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLES.COMMENTS,
    IndexName: "taskId-index",
    KeyConditionExpression: "taskId = :taskId",
    ExpressionAttributeValues: { ":taskId": taskId },
  }));
  return (Items || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function deleteComment(commentId, taskId) {
  await docClient.send(new DeleteCommand({ TableName: TABLES.COMMENTS, Key: { commentId, taskId } }));
  return true;
}

module.exports = { createComment, getCommentsByTask, deleteComment };
