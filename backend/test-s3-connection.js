require("dotenv").config({ path: "./product-service/.env" });
const AWS = require("aws-sdk");

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
});

(async () => {
  try {
    const buckets = await s3.listBuckets().promise();
    console.log("✅ S3 connected");

    buckets.Buckets.forEach((b) => console.log("-", b.Name));

    const upload = await s3
      .upload({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: "test/hello.txt",
        Body: "Hello from Node.js",
        ContentType: "text/plain",
      })
      .promise();

    console.log("✅ Upload success");
    console.log(upload.Location);
  } catch (err) {
    console.error("❌ S3 Error:", err.message);
  }
})();
