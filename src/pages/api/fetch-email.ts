import { getAuth } from "@clerk/nextjs/server";
import { NextApiResponse } from "next";
import { NextApiRequest } from "next";
import { emailHelper, s3Helper } from "~/lib/buildHelpers";
import { chunk } from "lodash";
import dayjs from "dayjs";
import { db } from "~/server/db";

interface EmailContent {
  type: "html" | "text";
  content: string;
}

interface EmailPerson {
  name: string;
  email: string;
}

interface ProcessedEmail {
  id: string;
  emailFrom: EmailPerson;
  emailSubject: string;
  emailTo: EmailPerson[];
  emailDate: string;
  emailSnippet: string;
  content: EmailContent[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await emailHelper.init(userId);

    const emails = await emailHelper.fetchEmails();
    const existingEmails = await db.email.findMany({
      where: {
        emailFromId: {
          in: emails.messages?.map((email) => email.id ?? ""),
        },
      },
    });
    const filteredEmails = emails.messages?.filter(
      (email) => !existingEmails.some((e) => e.id === email.id),
    );
    // Process emails in chunks to avoid overwhelming the API
    const emailChunks = chunk(filteredEmails, 40);

    const processedEmails: { parsedEmail: ProcessedEmail; rawEmail: any }[] =
      [];

    const existingUser = await db.user.findUnique({
      where: {
        id: userId,
      },
    });
    if (!existingUser) {
      return res.status(401).json({ error: "User not found" });
    }
    // // Process each chunk sequentially
    for (const emailChunk of emailChunks) {
      const chunkResults = await Promise.all(
        emailChunk.map(async (email: any) => {
          try {
            const emailDetails = await emailHelper.getEmailById(email.id);
            const formattedEmail = emailHelper.formatEmail(emailDetails);
            return {
              parsedEmail: formattedEmail,
              rawEmail: emailDetails,
            };
          } catch (error) {
            console.error("Error processing email:", error);
            return null;
          }
        }),
      );

      processedEmails.push(...chunkResults.filter((result) => result !== null));
    }
    // Save emails to database in chunk of 3
    const emailChunks_2 = chunk(processedEmails, 3);
    for (const emailChunk of emailChunks_2) {
      const chunkResults_2 = await Promise.all(
        emailChunk.map(async (email) => {
          try {
            const existingEmail = await db.email.findUnique({
              where: {
                id: email.parsedEmail.id,
              },
            });
            if (existingEmail) {
              return null;
            }
            const recipientEmails = email.parsedEmail.emailTo.map(
              (recipient) => recipient.email,
            );
            const existingRecipients = await db.email_person.findMany({
              where: { email: { in: recipientEmails } },
            });
            const existingEmailsSet = new Set(
              existingRecipients.map((r) => r.email),
            );

            // 3️⃣ Bulk insert only missing recipients
            const newRecipientsData = email.parsedEmail.emailTo
              .filter((recipient) => !existingEmailsSet.has(recipient.email))
              .map((recipient) => ({
                email: recipient.email,
                name: recipient.name,
              }));

            if (newRecipientsData.length > 0) {
              await db.email_person.createMany({
                data: newRecipientsData,
                skipDuplicates: true, // Prevents errors on concurrent inserts
              });
            }

            // 4️⃣ Fetch all recipients again (ensuring we now have them all)
            const allRecipients = await db.email_person.findMany({
              where: { email: { in: recipientEmails } },
            });
            await s3Helper.uploadEmailJsonToS3({
              emailData: {
                parsedEmail: email.parsedEmail,
                rawEmail: email.rawEmail,
              },
              key: email.parsedEmail.id,
            });
            const createdEmail = await db.email.upsert({
              where: {
                id: email.parsedEmail.id,
              },
              update: {
                emailContent:
                  email.parsedEmail.content.find(
                    (content) => content.type === "text",
                  )?.content ?? "",
                emailSnippet: email.parsedEmail.emailSnippet,
                emailDate: dayjs(email.parsedEmail.emailDate).toDate(),
                emailSubject: email.parsedEmail.emailSubject,
              },
              create: {
                id: email.parsedEmail.id,
                emailContent:
                  email.parsedEmail.content.find(
                    (content) => content.type === "text",
                  )?.content ?? "",
                emailSnippet: email.parsedEmail.emailSnippet,
                emailDate: dayjs(email.parsedEmail.emailDate).toDate(),
                emailSubject: email.parsedEmail.emailSubject,
                sender: {
                  connectOrCreate: {
                    where: {
                      email: email.parsedEmail.emailFrom.email,
                      name: email.parsedEmail.emailFrom.name,
                    },
                    create: {
                      email: email.parsedEmail.emailFrom.email,
                      name: email.parsedEmail.emailFrom.name,
                    },
                  },
                },
              },
            });
            const existingEmailToEmail = await db.emailToEmail.findMany({
              where: {
                emailId: createdEmail.id,
              },
            });

            await db.emailToEmail.createMany({
              data: allRecipients.map((recipient) => ({
                emailId: createdEmail.id,
                emailPersonId: recipient.id,
                isTo: true,
              })),
            });
          } catch (error) {
            console.error(
              `Error processing email: ${email.parsedEmail.id}`,
              error,
            );
            return null;
          }
        }),
      );
    }
    // const email = await db.email.findUnique({
    //   where: {
    //     id: "19588ef70be75331"
    //   },
    //   select: {
    //     emailHtml: true,
    //   },
    // });
    // res.status(200).json({
    //   email,
    // });
  } catch (error) {
    console.error("Error processing emails:", error);
    res.status(500).json({ error: "Failed to process emails" });
  }
}
