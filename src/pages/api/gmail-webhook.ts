// import { getAuth } from "@clerk/nextjs/server";
import { NextApiRequest, NextApiResponse } from "next";
import { emailHelper } from "~/lib/buildHelpers";
import { createTRPCContext } from "~/server/api/trpc";
import redisClient from "~/lib/redis";
import { db } from "~/server/db";
import Redis from "ioredis";

// This will handle the incoming Pub/Sub push messages
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Parse the incoming message from Pub/Sub (the body is base64 encoded)
    console.log("Received Gmail webhook");
    const message = req.body.message;
    const data = Buffer.from(message.data, "base64").toString("utf-8");
    const redis = new Redis("redis://localhost:6379");
    console.log("Received Gmail update:", JSON.parse(data));

    // Respond with an HTTP 200 OK to acknowledge receipt of the message
    res.status(200).send("OK");
    const parsedData = JSON.parse(data);
    const user = await db.email_person.findFirst({
      where: {
        email: parsedData.emailAddress,
      },
    });
    if (!user || !user.userId) {
      throw new Error("User not found");
    }
    await emailHelper.init(user.userId);
    const historyId = await redisClient.get(`gmail-watch-${user.userId}`);
    await emailHelper.syncRecentEmails(historyId as string);

    redisClient.set(`gmail-watch-${user.userId}`, String(parsedData.historyId));
    // invalidate cache
    const relatedKeys = await redisClient.smembers(`emailsFeed:${user.userId}`);
    for (const key of relatedKeys) {
      await redisClient.del(key);
    }
    await redis.publish("gmail-updates", "gmail-webhook-has-synced");
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).send("Internal Server Error");
  }
}
