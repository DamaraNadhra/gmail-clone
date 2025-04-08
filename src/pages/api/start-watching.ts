import { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";
import { simpleParser } from "mailparser";
import { s3Helper, emailHelper } from "~/lib/buildHelpers";
// import { auth, clerkClient, getAuth } from "@clerk/nextjs/server";
import redisClient from "~/lib/redis";
import { auth } from "~/lib/auth";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const session = await auth({ req, res });
    if (!session) {
      throw new Error("User not found");
    }
    await emailHelper.init(session.user.id);
    const response = await emailHelper.watchGmail();
    
    redisClient.set(`gmail-watch-${session.user.id}`, response.historyId);
    res.status(200).json({ message: "Gmail watching started from historyId: " + response.historyId });
    // res.status(200).json({ message: "Gmail watching started", oauthToken });
  } catch (error) {
    console.error("Error starting Gmail watching:", error);
    res.status(500).json({ message: "Failed to start Gmail watching" });
  }
}
