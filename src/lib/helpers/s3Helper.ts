import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";

export class S3Helper {
  private client: S3Client;
  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  async uploadEmailJsonToS3({
    emailData,
    key,
  }: {
    emailData: object;
    key: string;
  }) {
    try {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: `${key}.json`,
        Body: JSON.stringify(emailData),
        ContentType: "application/json",
      };
      // check if the file already exists
      const bucketName = process.env.AWS_BUCKET_NAME!;
      const objectKey = `${key}.json`;

      try {
        // Check if the file exists
        const headCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        });
        await this.client.send(headCommand);
        console.log(`⚠️ File already exists: ${objectKey}, skipping upload.`);
      } catch (error: any) {
        if (error.name === "NotFound") {
          // File does not exist, proceed with upload
          const putCommand = new PutObjectCommand(params);
          await this.client.send(putCommand);
          console.log(`✅ Uploaded email JSON to S3: ${objectKey}`);
        } else {
          console.error("❌ Error checking file existence:", error);
        }
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
    }
  }

  async getFromS3(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: `${key}.json`,
    });
    try {
      const response = await this.client.send(command);
      const stringBody = await response.Body?.transformToString();
      return JSON.parse(stringBody || "{}");
    } catch (error) {
      console.error(`❌ Get error for messageId: ${key}`, error);
    }
  }
}
