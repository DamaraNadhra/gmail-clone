import { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";
import { simpleParser } from "mailparser";
import { s3Helper, emailHelper } from "~/lib/buildHelpers";
import { auth, getAuth } from "@clerk/nextjs/server";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { emailId } = req.query;
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await emailHelper.init(userId);
  const draft = await emailHelper.getDraftById("r1920876752488173631");
  res.status(200).json({ data: draft });
}
