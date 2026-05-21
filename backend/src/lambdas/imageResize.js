// Lambda: image-resize
// Triggered by S3 PUT events on the originals bucket
// Resizes images and saves to the resized bucket

const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

// sharp must be bundled with this Lambda (npm install sharp in the lambda folder)
const sharp = require("sharp");

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const RESIZED_BUCKET = process.env.S3_RESIZED_BUCKET || "mini-jira-resized";
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    const sourceBucket = record.s3.bucket.name;
    const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    // Only process image files
    const ext = sourceKey.split(".").pop().toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      console.log(`Skipping non-image file: ${sourceKey}`);
      continue;
    }

    try {
      // Download original
      const { Body, ContentType } = await s3.send(new GetObjectCommand({
        Bucket: sourceBucket,
        Key: sourceKey,
      }));

      const chunks = [];
      for await (const chunk of Body) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      // Resize
      const resized = await sharp(buffer)
        .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "inside", withoutEnlargement: true })
        .toBuffer();

      // Upload to resized bucket with same key
      await s3.send(new PutObjectCommand({
        Bucket: RESIZED_BUCKET,
        Key: sourceKey,
        Body: resized,
        ContentType: ContentType || "image/jpeg",
        Metadata: { "original-key": sourceKey, "original-bucket": sourceBucket },
      }));

      console.log(`Resized: ${sourceKey} → ${RESIZED_BUCKET}/${sourceKey}`);
      results.push({ key: sourceKey, status: "resized" });
    } catch (err) {
      console.error(`Error resizing ${sourceKey}:`, err);
      results.push({ key: sourceKey, status: "error", error: err.message });
    }
  }

  return { statusCode: 200, body: JSON.stringify(results) };
};
