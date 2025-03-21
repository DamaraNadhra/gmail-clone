import { clerkClient } from "@clerk/nextjs/server";
import { EmailHelper } from "./helpers/emailHelper";
import redisClient from "./redis";
import { TwillioHelper } from "./helpers/twilioHelper";
import { S3Helper } from "./helpers/s3Helper";

export const Client = await clerkClient();

export const emailHelper = new EmailHelper(Client, redisClient);

export const twilioHelper = new TwillioHelper(
  process.env.TWILIO_ACCOUND_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export const s3Helper = new S3Helper();

/** 🔹 Auto-init emailHelper if the user has an active session */
export async function autoInitEmailHelper(userId: string) {
  const user = await Client.users.getUser(userId);

  if (user) {
    console.log(`Auto-initializing EmailHelper for user: ${userId}`);
    await emailHelper.init(userId);
  }
}
