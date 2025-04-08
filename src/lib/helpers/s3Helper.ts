import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    email,
    key,
  }: {
    email: {
      html: string;
      attachments: any[];
    };
    key: string;
  }) {
    try {
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: `${key}.json`,
        Body: JSON.stringify(email),
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

  async uploadEmailHtmlToS3({
    messageId,
    emailHtml,
  }: {
    messageId: string;
    emailHtml?: string;
  }) {
    // check if the file already exists
    const bucketName = process.env.AWS_BUCKET_NAME!;
    const objectKey = `${messageId}/email.html`;
    const htmlDownloadKey = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${objectKey.replaceAll(" ", "+")}`;
    try {
      // Check if the file exists
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });
      await this.client.send(headCommand);
      console.log(`⚠️ File already exists: ${objectKey}, skipping upload.`);
      return htmlDownloadKey;
    } catch (error: any) {
      if (error.name === "NotFound") {
        // File does not exist, proceed with upload
        try {
          await this.client.send(
            new PutObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME!,
              Key: `${messageId}/email.html`,
              Body: emailHtml,
              ContentType: "text/html",
            }),
          );
          console.log(`✅ Uploaded email html to ${messageId}/`);
          return htmlDownloadKey;
        } catch (error) {
          console.error("❌ Error uploading email html:", error);
          return null;
        }
      } else {
        console.error("❌ Error checking file existence:", error);
      }
    }
  }

  async uploadAttachmentToS3({
    messageId,
    attachment,
  }: {
    messageId: string;
    attachment: any;
  }) {
    const filename =
      attachment.filename ?? "attachment_" + attachment.contentType;
    const bucketName = process.env.AWS_BUCKET_NAME!;
    const objectKey = `${messageId}/attachments/${filename}`;
    const attachmentDownloadKey = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${objectKey.replaceAll(" ", "+")}`;
    try {
      // Check if the file exists
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
      });
      await this.client.send(headCommand);
      console.log(`⚠️ File already exists: ${objectKey}, skipping upload.`);
      return attachmentDownloadKey;
    } catch (error: any) {
      if (error.name === "NotFound") {
        // File does not exist, proceed with upload
        try {
          const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: attachment.content,
            ContentType: attachment.contentType,
          });
          await this.client.send(putCommand);
          console.log(`✅ Uploaded attachment to ${objectKey}`);
          return attachmentDownloadKey;
        } catch (error) {
          console.error("❌ Error uploading attachment:", error);
          return null;
        }
      } else {
        console.error("❌ Error checking file existence:", error);
      }
    }
  }

  async getEmailHtmlFromS3(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: `${key}/email.html`,
    });
    try {
      const response = await this.client.send(command);
      const stringBody = await response.Body?.transformToString();
      return stringBody;
    } catch (error) {
      console.error(`❌ Get error for messageId: ${key}`, error);
      return null;
    }
  }

  async getAttachmentFromS3(key: string, filename: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: `${key}/attachments/${filename}`,
    });
    try {
      const response = await this.client.send(command);
      const stringBody = await response.Body?.transformToString();
      return stringBody;
    } catch (error) {
      console.error(`❌ Get error for messageId: ${key}`, error);
      return null;
    }
  }

  async generateLongTermPresignedUrl(messageId: string, filename: string) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME, // Your S3 bucket name
      Key: `${messageId}/attachments/${filename}`, // Path to your file
      Expires: 60 * 60 * 24 * 365 * 10, // Set expiration to 10 years (in seconds)
    };

    try {
      // Generate the pre-signed URL for downloading the attachment
      const command = new GetObjectCommand(params);
      const url = await getSignedUrl(this.client, command, {
        expiresIn: params.Expires,
      });

      console.log("Generated pre-signed URL with long expiry:", url);
      return url; // The pre-signed URL for downloading the attachment
    } catch (error) {
      console.error("Error generating pre-signed URL:", error);
      throw new Error("Error generating pre-signed URL");
    }
  }
}
