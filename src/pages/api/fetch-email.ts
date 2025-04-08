// import { clerkClient, getAuth } from "@clerk/nextjs/server";
import { NextApiResponse } from "next";
import { NextApiRequest } from "next";
import { emailHelper, s3Helper } from "~/lib/buildHelpers";
import { chunk } from "lodash";
import dayjs from "dayjs";
import { db } from "~/server/db";
import { auth } from "~/lib/auth";
import { simpleParser } from "mailparser";
import { FileContent, FileFormatType } from "@prisma/client";
import moment from "~/utils/moment-adapter";

interface EmailContent {
  type: "html" | "text";
  content: string;
}

interface EmailPerson {
  name: string;
  email: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await auth({ req, res });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const user = session.user;
    const threads = await emailHelper.getThreads();
    const existingThreads = await db.thread.findMany({
      where: {
        id: {
          in: threads.threads
            ?.map((thread) => thread.id ?? "")
            .filter((id) => id !== ""),
        },
      },
    });
    const filteredThreads = threads.threads?.filter(
      (thread) => !existingThreads.some((t) => t.id === thread.id),
    );
    // Process emails in chunks to avoid overwhelming the API
    const threadChunks = chunk(filteredThreads, 40);
    const processedEmails: any[] = [];

    const existingUser = await db.user.findUnique({
      where: {
        id: user.id,
      },
    });
    if (!existingUser) {
      await db.user.create({
        data: {
          id: user.id,
          fullName: user.fullName ?? "",
          provider: "google",
          firstName: user.fullName?.split(" ")[0] ?? "",
          lastName: user.fullName?.split(" ")[1] ?? "",
          imageUrl: user.imageUrl ?? "",
          email_person: {
            connectOrCreate: {
              where: {
                name_email: {
                  name: user.fullName ?? "",
                  email: user.email ?? "",
                },
              },
              create: {
                email: user.email ?? "",
                name: user.fullName ?? "",
              },
            },
          },
        },
      });
    }
    const existingUserEmail = await db.email_person.findUnique({
      where: {
        userId: user.id,
      },
    });
    if (!existingUserEmail) {
      await db.email_person.create({
        data: {
          userId: user.id,
          email: user.email ?? "",
          name: user.fullName ?? "",
        },
      });
    }

    // process each threadChunks sequentially
    for (const threadChunk of threadChunks) {
      await Promise.all(
        threadChunk.map(async (thread: any) => {
          const { id, messages, snippet, historyId } = await emailHelper.getThreadById(thread.id);
          const latestMessage = messages?.sort((a, b) => moment(b.internalDate).isBefore(moment(a.internalDate)) ? 1 : -1)[0];
          await db.thread.upsert({
            where: { id: thread.id },
            update: {},
            create: { id: thread.id, snippet: snippet ?? "", historyId: historyId ?? "", threadDate: moment(latestMessage?.internalDate).toDate() },
          });
          console.log(`Inserting ${messages?.length} emails for thread ${id}`);
          if (messages && messages.length > 0) {
            const emailsChunkResults = await Promise.all(
              messages.map(async (message: any) => {
                if (!message.id) {
                  return null;
                }
                try {
                  const emailDetails: any = await emailHelper.getEmailById(
                    message.id,
                  );
                  const parsedEmail =
                    await emailHelper.formatEmail(emailDetails);
                  return parsedEmail;
                } catch (error) {
                  console.error("Error processing email:", error);
                  return null;
                }
              }),
            );
            processedEmails.push(
              ...emailsChunkResults.filter((result) => result !== null),
            );
          }
        }),
      );
    }

    // const emailChunks = chunk(filteredEmails, 40);
    // // Process each chunk sequentially
    // for (const emailChunk of emailChunks) {
    //   const chunkResults = await Promise.all(
    //     emailChunk.map(async (email: any) => {
    //       try {
    //         const emailDetails: any = await emailHelper.getEmailById(email.id);
    //         const parsedEmail = await emailHelper.formatEmail(emailDetails);
    //         return parsedEmail;
    //       } catch (error) {
    //         console.error("Error processing email:", error);
    //         return null;
    //       }
    //     }),
    //   );

    //   processedEmails.push(...chunkResults.filter((result) => result !== null));
    // }
    // process all senders
    const senders = processedEmails.map((email) => email.from).flat();
    const existingSenders = await db.email_person.findMany({
      where: {
        email: {
          in: senders
            .filter((sender) => sender !== undefined)
            .map((sender: any) => sender.address),
        },
      },
    });
    const existingSendersSet = new Set(
      existingSenders.map((sender) => sender.email),
    );
    const newSenders = senders.filter(
      (sender) => !existingSendersSet.has(sender?.address ?? ""),
    );
    const uniqueSenders = newSenders.filter(
      (value, index, self) =>
        index === self.findIndex((t) => t?.address === value?.address),
    );
    await db.email_person.createMany({
      data: uniqueSenders.map((sender) => ({
        email: sender?.address!,
        name: sender?.name ?? "",
      })),
      skipDuplicates: true,
    });

    // Save emails to database in chunk of 3
    const emailChunks_2 = chunk(processedEmails, 3);
    for (const emailChunk of emailChunks_2) {
      const chunkResults_2 = await Promise.all(
        emailChunk.map(async (email) => {
          try {
            console.log("Processing email:", email.id);
            const existingEmail = await db.email.findUnique({
              where: {
                id: email.id,
              },
            });
            if (existingEmail) {
              console.log("Email already exists:", email.id);
              return null;
            }
            const sender = await db.email_person.findFirst({
              where: {
                email: email.from?.[0]?.address!,
              },
            });
            if (!sender) {
              return null;
            }
            const recipientEmails = email.to.map(
              (recipient: any) => recipient.address,
            );
            const existingRecipients = await db.email_person.findMany({
              where: { email: { in: recipientEmails } },
            });
            const existingEmailsSet = new Set(
              existingRecipients.map((r) => r.email),
            );

            // 3️⃣ Bulk insert only missing recipients
            const newRecipientsData = email.to
              .filter(
                (recipient: any) => !existingEmailsSet.has(recipient.address),
              )
              .map((recipient: any) => ({
                email: recipient.address,
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
            const htmlDownloadKey = await s3Helper.uploadEmailHtmlToS3({
              messageId: email.id,
              emailHtml: email.html ? email.html : email.textAsHtml,
            });
            const createdEmail = await db.email.create({
              data: {
                id: email.id,
                emailContent: email.text ?? "",
                emailSnippet: email.snippet ?? "",
                emailDate: dayjs(email.date).toDate(),
                emailSubject: email.subject ?? "",
                labelIds: email.labelIds ?? [],
                sender: {
                  connect: {
                    id: sender.id,
                  },
                },
                thread: {
                  connectOrCreate: {
                    where: {
                      id: email.threadId,
                    },
                    create: {
                      id: email.threadId,
                      threadDate: email.date,
                      subject: email.subject ?? "",
                      snippet: email.snippet ?? "",
                    },
                  },
                },
              },
            });

            // process the email html
            if (email.html) {
              await db.file.create({
                data: {
                  fileName: `email-${createdEmail.id}.html`,
                  fileFormatType: FileFormatType.html,
                  fileContentType: FileContent.email,
                  fileSize: email.html.length,
                  downloadKey: htmlDownloadKey ?? undefined,
                  emailIdForHtml: createdEmail.id,
                },
              });
            }
            // process attachments
            if (email.attachments.length > 0) {
              console.log(
                `Processing ${email.attachments.length} attachments for email: ${email.id}`,
              );
              for (const attachment of email.attachments) {
                const existingAttachment = await db.file.findUnique({
                  where: {
                    fileName: attachment.filename,
                    emailIdForPdf: email.id,
                  },
                });
                if (existingAttachment) {
                  continue;
                }
                const presignedUrl = await s3Helper.uploadAttachmentToS3({
                  messageId: email.id,
                  attachment,
                });
                let fileFormatType: FileFormatType;
                switch (attachment.contentType) {
                  case "application/pdf":
                    fileFormatType = FileFormatType.pdf;
                    break;
                  default:
                    fileFormatType = FileFormatType.other;
                }
                try {
                  await db.file.create({
                    data: {
                      fileName: attachment.filename ?? "",
                      ...(fileFormatType === FileFormatType.pdf
                        ? { emailIdForPdf: email.id }
                        : {}),
                      fileFormatType: fileFormatType,
                      fileContentType: FileContent.emailAttachment,
                      fileSize: attachment.size,
                      downloadKey: presignedUrl ?? undefined,
                      emailAttachment: {
                        create: {
                          fileName: attachment.filename ?? "",
                          emailId: email.id,
                        },
                      },
                    },
                  });
                } catch (error) {
                  if (
                    error instanceof Error &&
                    error.message.includes("P2002")
                  ) {
                    // Skip if file already exists
                    continue;
                  }
                  throw error;
                }
              }
            }
            const existingEmailToEmail = await db.emailToEmail.findMany({
              where: {
                emailId: createdEmail.id,
              },
            });
            if (existingEmailToEmail.length === 0) {
              await db.emailToEmail.createMany({
                data: allRecipients.map((recipient) => ({
                  emailId: createdEmail.id,
                  emailPersonId: recipient.id,
                  isTo: true,
                })),
              });
            }
          } catch (error) {
            console.error(`Error processing email: ${email.id}`, error);
            return null;
          }
        }),
      );
    }
    res.status(200).json({
      message: `Processed ${processedEmails.length} emails`,
      emails: processedEmails.map((email) => email.id),
    });
  } catch (error) {
    console.error("Error processing emails:", error);
    res.status(500).json({ error: "Failed to process emails" });
  }
}
