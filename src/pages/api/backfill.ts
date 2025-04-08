import { NextApiResponse } from "next";
import { NextApiRequest } from "next";
import { emailHelper } from "~/lib/buildHelpers";
import { db } from "~/server/db";
import { auth } from "~/lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth({ req, res });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const emails = await db.email.findMany({
    where: {
      emailHtml: {
        isNot: null,
      },
    },
    select: {
      threadId: true,
      id: true,
    },
  });

  for (const email of emails) {
    const emailId = email.id;
    await db.file.update({
      where: {
        emailIdForHtml: emailId,
      },
      data: {
        downloadKey: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${emailId}/email.html`,
      },
    });
  }

  res.status(200).json({ message: "Backfilled" });
}
