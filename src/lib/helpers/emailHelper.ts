import { Redis } from "@upstash/redis";
import { gmail, gmail_v1 } from "@googleapis/gmail";
import { OAuth2Client } from "google-auth-library";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";
import { chunk } from "lodash";
import { S3Helper } from "./s3Helper";
import { google, GoogleApis } from "googleapis";
import dayjs from "dayjs";
import { Session } from "next-auth";
import { simpleParser } from "mailparser";
interface EmailPart {
  mimeType: string;
  body?: {
    data: string;
  };
  parts?: EmailPart[];
}
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

interface EmailDraftData {
  emailSubject: string;
  emailContent: string;
  emailTo: string[];
  emailFrom: string;
  emailCc?: string[];
  emailBcc?: string[];
}

export class EmailHelper {
  private oauthToken: string | null = null;
  private gmailClient: gmail_v1.Gmail;
  private googleClient: any;
  private oauth2Client: OAuth2Client;
  constructor(
    private redisClient: Redis,
    private prismaClient: PrismaClient,
    private s3Helper: S3Helper,
  ) {
    this.oauth2Client = new OAuth2Client(
      process.env.AUTH_GOOGLE_CLIENT_ID,
      process.env.AUTH_GOOGLE_CLIENT_SECRET,
      process.env.OAUTH_GOOGLE_REDIRECT_URI,
    );
    this.gmailClient = gmail({ version: "v1", auth: this.oauth2Client });
  }
  /** 🔹 Initializes the OAuth token, but only if the user is logged in */
  async init(accessToken: string, refreshToken: string) {
    if (!refreshToken) {
      console.log("No OAuth tokens found for the user.");
      return;
    }
    this.oauthToken = accessToken;
    this.oauth2Client.setCredentials({ refresh_token: refreshToken, access_token: accessToken });
    this.gmailClient = gmail({ version: "v1", auth: this.oauth2Client });
    this.googleClient = google.people({
      version: "v1",
      auth: this.oauth2Client,
    });
  }

  async watchGmail() {
    const topicName = `projects/gmail-clone-453603/topics/push-notif`;
    const response = await this.gmailClient.users.watch({
      userId: "me",
      requestBody: {
        labelIds: ["INBOX"], // You can set up multiple labels if needed
        topicName: topicName, // Replace with your Pub/Sub topic
      },
      auth: this.oauth2Client,
    });

    return response.data;
  }

  async modifyEmail({
    emailId,
    isArchived,
    isStarred,
    isImportant,
    isSpam,
    isTrash,
    isRead,
  }: {
    emailId: string;
    isArchived?: boolean;
    isStarred?: boolean;
    isImportant?: boolean;
    isSpam?: boolean;
    isTrash?: boolean;
    isRead?: boolean;
  }) {
    const labelsToAdd = [];
    const labelsToRemove = [];
    if (isArchived) {
      labelsToRemove.push("INBOX");
    } else {
      labelsToAdd.push("INBOX");
    }
    if (isStarred) {
      labelsToAdd.push("STARRED");
    } else {
      labelsToRemove.push("STARRED");
    }
    if (isImportant) {
      labelsToAdd.push("IMPORTANT");
    } else {
      labelsToRemove.push("IMPORTANT");
    }
    if (isSpam) {
      labelsToAdd.push("SPAM");
    } else {
      labelsToRemove.push("SPAM");
    }
    if (isTrash) {
      labelsToAdd.push("TRASH");
    } else {
      labelsToRemove.push("TRASH");
    }
    if (isRead) {
      labelsToRemove.push("UNREAD");
    } else {
      labelsToAdd.push("UNREAD");
    }

    const response = await this.gmailClient.users.messages.modify({
      userId: "me",
      id: emailId,
      requestBody: {
        addLabelIds: labelsToAdd,
        removeLabelIds: labelsToRemove,
      },
    });
    return response.data;
  }

  async getHistoryData(historyId: string) {
    const response = await this.gmailClient.users.history.list({
      userId: "me",
      historyTypes: [
        "messageAdded",
        "messageDeleted",
        "labelAdded",
        "labelRemoved",
      ],
      startHistoryId: historyId,
    });
    return response.data;
  }

  async getUserProfile() {

    const res = await this.googleClient.people.get({
      resourceName: "people/me",
      personFields: "names,emailAddresses,photos",
    });

    return res.data;
  }

  /** 🔹 Fetches emails */
  async fetchEmails() {

    const response = await this.gmailClient.users.messages.list({
      userId: "me",
    });

    return response.data;
  }

  async getDraftById(draftId: string) {
    const response = await this.gmailClient.users.drafts.get({
      userId: "me",
      id: draftId,
    });
    return response.data;
  }

  async formatEmail(email: any) {
    const decodedEmail = Buffer.from(email?.raw ?? "", "base64").toString(
      "utf-8",
    );
    const parsedEmail = await simpleParser(decodedEmail);
    return {
      id: email.id,
      threadId: email.threadId,
      labelIds: email.labelIds,
      snippet: email.snippet,
      ...parsedEmail,
      to: parsedEmail.to?.value,
      from: parsedEmail.from?.value,
    };
  }

  async getRecentEmails(amount: number = 20) {
    const response = await this.gmailClient.users.messages.list({
      userId: "me",
      maxResults: amount,
    });
    return response.data;
  }

  /** 🔹 Fetches an email by its ID */
  async getEmailById(emailId: string, useCache: boolean = true) {


    try {
      if (useCache) {
        const cachedEmail = await this.getEmailFromCache(emailId);
        if (cachedEmail) {
          console.log("Email found in cache");
          return cachedEmail;
        }
      }
    } catch (err) {
      console.error("Redis cache error:", err);
      // Continue with fetching from Gmail API if cache fails
    }
    try {
      const response = await this.gmailClient.users.messages.get({
        userId: "me",
        id: emailId,
        format: "raw",
      });

      try {
        await this.cacheEmail(emailId, response.data);
      } catch (err) {
        console.error("Failed to cache email:", err);
        // Continue even if caching fails
      }
      return response.data;
    } catch (err) {
      console.error("Failed to get email:", err);
      return null;
    }
  }

  async fetchEmailById(emailId: string) {
    const response = await this.gmailClient.users.messages.get({
      userId: "me",
      id: emailId,
      format: "full",
    });
    return response.data;
  }

  private async getEmailFromCache(emailId: string): Promise<string | null> {
    try {
      return await this.redisClient.get(emailId);
    } catch (err) {
      console.error("Failed to get email from cache:", err);
      return null;
    }
  }

  getContent(data: EmailPart): EmailContent[] {
    if (!data) return [];

    const result: EmailContent[] = [];

    // Handle text/html content
    if (data.mimeType === "text/html" && data.body?.data) {
      result.push({ type: "html", content: data.body.data });
    }

    // Handle text/plain content
    if (data.mimeType === "text/plain" && data.body?.data) {
      result.push({ type: "text", content: data.body.data });
    }

    // Handle multipart types (alternative, mixed, related)
    if (data.mimeType?.startsWith("multipart/") && Array.isArray(data.parts)) {
      for (const part of data.parts) {
        const nestedContent = this.getContent(part);
        result.push(...nestedContent);
      }
    }

    return result;
  }

  /** 🔹 Cache the email data in Redis */
  private async cacheEmail(emailId: string, emailData: any): Promise<void> {
    try {
      // Cache email for 1 hour (3600 seconds)
      await this.redisClient.setex(emailId, 3600, emailData);
    } catch (err) {
      console.error("Failed to cache email:", err);
      throw err;
    }
  }

  private createRawMessage({
    emailSubject,
    emailTo,
    emailFrom,
    emailContent,
    emailCc,
    emailBcc,
  }: EmailDraftData) {
    const messageParts = [
      `To: ${emailTo}`,
      ...(emailCc ? [`Cc: ${emailCc.join(", ")}`] : []),
      ...(emailBcc ? [`Bcc: ${emailBcc.join(", ")}`] : []),
      `Subject: ${emailSubject}`,
      `From: ${emailFrom}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      emailContent,
    ];

    const message = messageParts.join("\n");
    return Buffer.from(message).toString("base64");
  }

  async getThreads() {
    const response = await this.gmailClient.users.threads.list({
      userId: "me",
      labelIds: ["INBOX"],
    });
    return response.data;
  }

  async getThreadById(threadId: string) {
    const response = await this.gmailClient.users.threads.get({
      userId: "me",
      id: threadId,
      format: "minimal",
    });
    return response.data;
  }

  async createDraft(emailData: EmailDraftData) {
    const rawMessage = this.createRawMessage(emailData);
    console.log("rawMessage", rawMessage);
    const response = await this.gmailClient.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: rawMessage,
        },
      },
    });
    return response.data;
  }

  async updateDraft(draftId: string, emailData: EmailDraftData) {

    const rawMessage = this.createRawMessage(emailData);
    const response = await this.gmailClient.users.drafts.update({
      userId: "me",
      id: draftId,
      requestBody: {
        message: {
          raw: rawMessage,
        },
      },
    });
    return response.data;
  }

  async sendEmailDraft(draftId: string) {
    const response = await this.gmailClient.users.drafts.send({
      userId: "me",
      requestBody: {
        id: draftId,
      },
    });
    return response.data;
  }

  async syncRecentEmails(historyId: string, userId: string) {
    try {
      const historyData = await this.getHistoryData(historyId);
      console.log("History data:", historyData);
      const messagesToAdd =
        historyData.history?.[0]?.messagesAdded?.map((message) => ({
          id: message.message?.id,
          threadId: message.message?.threadId,
          operation: "add",
        })) ?? [];
      const messagesToDelete =
        historyData.history?.[0]?.messagesDeleted?.map((message) => ({
          id: message.message?.id,
          threadId: message.message?.threadId,
          operation: "delete",
        })) ?? [];

      if (messagesToAdd.length > 0 || messagesToDelete.length > 0) {
        const emailsToSyncChunks = chunk(
          [...messagesToAdd, ...messagesToDelete],
          10,
        );
        const processedEmails: {
          parsedEmail: ProcessedEmail;
          rawEmail: any;
          operation: "add" | "delete";
        }[] = [];

        const existingUser = await this.prismaClient.user.findUnique({
          where: {
            id: userId,
          },
        });
        if (!existingUser) {
          throw new Error("User not found");
        }
        // // Process each chunk sequentially
        for (const emailChunk of emailsToSyncChunks) {
          const chunkResults = await Promise.all(
            emailChunk.map(async (email: any) => {
              try {
                const emailDetails = await this.getEmailById(email.id);
                const formattedEmail = this.formatEmail(emailDetails);
                return {
                  parsedEmail: formattedEmail,
                  rawEmail: emailDetails,
                  operation: email.operation,
                };
              } catch (error) {
                console.error("Error processing email:", error);
                return null;
              }
            }),
          );

          processedEmails.push(
            ...chunkResults.filter((result) => result !== null),
          );
        }

        // process all senders
        const senders = processedEmails.map(
          (email) => email.parsedEmail.emailFrom,
        );
        const existingSenders = await this.prismaClient.email_person.findMany({
          where: {
            email: { in: senders.map((sender) => sender.email) },
          },
        });
        const existingSendersSet = new Set(
          existingSenders.map((sender) => sender.email),
        );
        const newSenders = senders.filter(
          (sender) => !existingSendersSet.has(sender.email),
        );
        const uniqueSenders = newSenders.filter(
          (value, index, self) =>
            index === self.findIndex((t) => t.email === value.email),
        );
        await this.prismaClient.email_person.createMany({
          data: uniqueSenders.map((sender) => ({
            email: sender.email,
            name: sender.name,
          })),
          skipDuplicates: true,
        });
        // Save emails to database in chunk of 3
        const emailChunks_2 = chunk(processedEmails, 3);
        for (const emailChunk of emailChunks_2) {
          await Promise.all(
            emailChunk.map(async (email) => {
              try {
                console.log("Processing email:", email.parsedEmail.id);
                if (email.operation === "add") {
                  const existingEmail =
                    await this.prismaClient.email.findUnique({
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
                  const existingRecipients =
                    await this.prismaClient.email_person.findMany({
                      where: { email: { in: recipientEmails } },
                    });
                  const sender = await this.prismaClient.email_person.findFirst(
                    {
                      where: {
                        email: email.parsedEmail.emailFrom.email,
                      },
                    },
                  );
                  if (!sender) {
                    return null;
                  }
                  const existingEmailsSet = new Set(
                    existingRecipients.map((r) => r.email),
                  );

                  // 3️⃣ Bulk insert only missing recipients
                  const newRecipientsData = email.parsedEmail.emailTo
                    .filter(
                      (recipient) => !existingEmailsSet.has(recipient.email),
                    )
                    .map((recipient) => ({
                      email: recipient.email,
                      name: recipient.name,
                    }));

                  if (newRecipientsData.length > 0) {
                    await this.prismaClient.email_person.createMany({
                      data: newRecipientsData,
                      skipDuplicates: true, // Prevents errors on concurrent inserts
                    });
                  }

                  // 4️⃣ Fetch all recipients again (ensuring we now have them all)
                  const allRecipients =
                    await this.prismaClient.email_person.findMany({
                      where: { email: { in: recipientEmails } },
                    });
                  await this.s3Helper.uploadEmailJsonToS3({
                    emailData: {
                      parsedEmail: email.parsedEmail,
                      rawEmail: email.rawEmail,
                    },
                    key: email.parsedEmail.id,
                  });
                  const createdEmail = await this.prismaClient.email.create({
                    data: {
                      id: email.parsedEmail.id,
                      emailContent:
                        email.parsedEmail.content.find(
                          (content) => content.type === "text",
                        )?.content ?? "",
                      emailSnippet: email.parsedEmail.emailSnippet,
                      emailDate: dayjs(email.parsedEmail.emailDate).toDate(),
                      emailSubject: email.parsedEmail.emailSubject,
                      sender: {
                        connect: {
                          id: sender.id,
                        },
                      },
                    },
                  });
                  const existingEmailToEmail =
                    await this.prismaClient.emailToEmail.findMany({
                      where: {
                        emailId: createdEmail.id,
                      },
                    });
                  if (existingEmailToEmail.length === 0) {
                    await this.prismaClient.emailToEmail.createMany({
                      data: allRecipients.map((recipient) => ({
                        emailId: createdEmail.id,
                        emailPersonId: recipient.id,
                        isTo: true,
                      })),
                    });
                  }
                } else if (email.operation === "delete") {
                  const existingEmail =
                    await this.prismaClient.email.findUnique({
                      where: {
                        id: email.parsedEmail.id,
                      },
                    });
                  if (existingEmail) {
                    await this.prismaClient.email.delete({
                      where: {
                        id: email.parsedEmail.id,
                      },
                    });
                  }
                }
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
      }
    } catch (error) {
      console.error("Error syncing recent emails:", error);
    }
  }

  async deleteDraft(draftId: string) {
    const response = await this.gmailClient.users.drafts.delete({
      userId: "me",
      id: draftId,
    });
    return response.data;
  }
}
