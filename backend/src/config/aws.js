const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { S3Client } = require("@aws-sdk/client-s3");
const { SNSClient } = require("@aws-sdk/client-sns");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { CloudWatchClient } = require("@aws-sdk/client-cloudwatch");

const region = process.env.AWS_REGION || "us-east-1";

const dynamoClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const s3Client = new S3Client({ region });
const snsClient = new SNSClient({ region });
const sqsClient = new SQSClient({ region });
const cwClient = new CloudWatchClient({ region });

module.exports = { docClient, s3Client, snsClient, sqsClient, cwClient, region };
