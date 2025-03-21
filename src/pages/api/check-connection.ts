import { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";
import { simpleParser } from "mailparser";
import { s3Helper, emailHelper } from "~/lib/buildHelpers";
import { auth, getAuth } from "@clerk/nextjs/server";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const result = await db.$queryRaw`SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database();`;
  console.log("Active connections:", result);
  res.status(200).json({ data: result });
}
