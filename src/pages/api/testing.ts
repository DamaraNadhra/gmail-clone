import { NextApiRequest, NextApiResponse } from "next";
import { auth } from "~/lib/auth";
import { s3Helper, emailHelper } from "~/lib/buildHelpers";
// import { auth, clerkClient, getAuth } from "@clerk/nextjs/server";
import { simpleParser } from "mailparser";
import redisClient from "~/lib/redis";

import Redis from "ioredis";
import { use } from "react";

const redis = new Redis("redis://localhost:6379");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth({ req, res });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // const threads = await emailHelper.getThreads();
  const emails = await emailHelper.fetchEmails()
  res.status(200).json({
    data: emails,
  });
}
