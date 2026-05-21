const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3Client } = require("../config/aws");
const { BUCKETS } = require("../config/constants");

async function uploadObject(bucket, key, body, contentType) {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

async function deleteObject(bucket, key) {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.error(`S3 delete error for ${key}:`, err.message);
  }
}

async function getPresignedUrl(bucket, key, expiresIn = 3600) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

function getPublicUrl(bucket, key) {
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}

module.exports = { uploadObject, deleteObject, getPresignedUrl, getPublicUrl, BUCKETS };
