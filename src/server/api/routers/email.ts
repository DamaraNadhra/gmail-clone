import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
// import { clerkClient } from "@clerk/nextjs/server";
import axios from "axios";
import { emailHelper, s3Helper } from "~/lib/buildHelpers";
import redisClient from "~/lib/redis";
import {
  thread,
  email_person,
  file,
  Email,
  FileContent,
  FileFormatType,
} from "@prisma/client";
import moment from "~/utils/moment-adapter";

const EmailsDataSchema = z.object({
  threads: z.array(
    z.custom<
      thread & {
        sender: email_person;
        emails: (Email & {
          sender: email_person;
          recipients: email_person[];
          emailPdf: file;
          attachments: {
            file: file;
          }[];
        })[];
        emailPdf: file;
        attachments: {
          file: file;
        }[];
      }
    >(),
  ),
  nextCursor: z.string().optional(),
});

type EmailsData = z.infer<typeof EmailsDataSchema>;

export const emailRouter = createTRPCRouter({
  // Fetch emails
  fetchEmails: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        search: z.string().optional().default(""),
        label: z.enum(["inbox", "sent"]).optional().default("inbox"),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const cacheKey = `emails:${input.userId}:${input.search}:${input.label}:${input.cursor || "none"}`;
        const relatedKeySet = `emailsFeed:${input.userId}`;

        // Check if the result is in the cache
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
          // If cached, parse and return it
          return EmailsDataSchema.parse(cachedData);
        }
        const threads = await ctx.db.thread.findMany({
          where: {
            emails: {
              some: {
                labelIds: {
                  has: input.label === "inbox" ? "INBOX" : "SENT",
                },
                OR: [
                  {
                    emailSubject: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    emailContent: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    sender: {
                      OR: [
                        {
                          email: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          name: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                  {
                    recipients: {
                      some: {
                        emailPerson: {
                          email: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          include: {
            emails: {
              select: {
                id: true,
                emailSubject: true,
                labelIds: true,
                threadId: true,
                emailDate: true,
                emailPdf: true,
                attachments: {
                  include: {
                    file: true,
                  },
                },
                sender: true,
                recipients: true,
              },
              orderBy: {
                emailDate: "desc",
              },
            },
          },
          orderBy: {
            threadDate: "desc",
          },
          take: 50 + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
        });

        let nextCursor: string | undefined;
        if (threads.length > 50) {
          const lastThread = threads.pop();
          nextCursor = lastThread?.id;
        }

        const result = { threads, nextCursor };

        // cache for 10 minutes
        await redisClient.setex(cacheKey, 60 * 10, JSON.stringify(result));

        // add to relatedKeySet
        await redisClient.sadd(relatedKeySet, cacheKey);

        return result;
      } catch (error) {
        console.error("Error fetching emails:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error fetching emails",
        });
      }
    }),
  getDrafts: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        search: z.string().optional().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userEmailPerson = await ctx.db.email_person.findFirst({
        where: {
          userId: input.userId,
        },
      });
      if (!userEmailPerson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User email not found",
        });
      }
      const drafts = await ctx.db.email.findMany({
        where: {
          emailFromId: userEmailPerson.id,
          labelIds: { has: "DRAFT" },
          OR: [
            { emailSubject: { contains: input.search, mode: "insensitive" } },
            { emailContent: { contains: input.search, mode: "insensitive" } },
            {
              recipients: {
                some: { emailPerson: { email: { contains: input.search } } },
              },
            },
            {
              sender: {
                email: { contains: input.search, mode: "insensitive" },
              },
            },
          ],
        },
        include: {
          sender: true,
          recipients: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50 + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (drafts.length > 50) {
        const lastDraft = drafts.pop();
        nextCursor = lastDraft?.id;
      }

      return { drafts, nextCursor };
    }),

  getEmailDraftsCount: protectedProcedure
    .input(z.object({}).optional().default({}))
    .query(async ({ ctx }) => {
      const userEmailPerson = await ctx.db.email_person.findFirst({
        where: { userId: ctx.session.user.id },
      });
      if (!userEmailPerson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User email not found",
        });
      }
      const count = await ctx.db.email.count({
        where: { emailFromId: userEmailPerson.id, labelIds: { has: "DRAFT" } },
      });

      return count;
    }),
  getUserEmailsCount: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional().default(""),
          label: z.enum(["inbox", "sent"]).optional().default("inbox"),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const cacheKey = `emails:${userId}:${input.search}:${input.label}`;
      const relatedKeySet = `emailsFeed:${userId}`;

      // Check if the result is in the cache
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log("cachedData", cachedData);
        // If cached, parse and return it
        return cachedData as number;
      }
      const search = input.search || "";
      const count = await ctx.db.email.count({
        where: {
          ...(input.label === "inbox"
            ? {
                labelIds: {
                  has: "INBOX",
                },
              }
            : {
                labelIds: {
                  has: "SENT",
                },
              }),
          OR: [
            {
              emailSubject: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              emailContent: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              sender: {
                email: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              recipients: {
                some: {
                  emailPerson: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          ],
        },
      });
      await redisClient.setex(cacheKey, 60 * 10, JSON.stringify(count));

      // add to relatedKeySet
      await redisClient.sadd(relatedKeySet, cacheKey);
      return count;
    }),
  getEmailById: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const email = await ctx.db.email.findUnique({
        where: {
          id: input.emailId,
        },
        include: {
          emailPdf: true,
          attachments: {
            include: {
              file: true,
            },
          },
          recipients: true,
          sender: true,
        },
      });

      return email;
    }),

  // Save draft email
  saveDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.string().optional(),
        subject: z.string().optional().default(""),
        to: z.array(z.string()).optional().default([]),
        cc: z.array(z.string()).optional().default([]),
        bcc: z.array(z.string()).optional().default([]),
        content: z.string().optional().default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await emailHelper.init(userId);

      // Get the user's email_person record
      const userEmailPerson = await ctx.db.email_person.findFirst({
        where: {
          userId,
        },
      });

      if (!userEmailPerson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User email not found",
        });
      }

      // Check if we're updating an existing draft or creating a new one
      if (input.draftId) {
        // Update existing draft
        try {
          const existingDraft = await ctx.db.email.findUnique({
            where: { id: input.draftId },
            include: { recipients: true },
          });

          if (!existingDraft) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Draft not found",
            });
          }

          // Check if the user owns this draft
          if (existingDraft.emailFromId !== userEmailPerson.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to edit this draft",
            });
          }

          // Only update if content has changed
          const contentChanged =
            existingDraft.emailSubject !== input.subject ||
            existingDraft.emailContent !== input.content;

          let updatedDraft = existingDraft;

          if (contentChanged) {
            // Update the draft
            updatedDraft = await ctx.db.email.update({
              where: { id: input.draftId },
              data: {
                emailSubject: input.subject,
                emailContent: input.content,
              },
              include: {
                recipients: true,
                sender: true,
              },
            });
          }

          // Handle recipients only if they've been provided and there are changes
          const existingRecipients = await ctx.db.emailToEmail.findMany({
            where: { emailId: input.draftId },
          });

          // validate to, cc, bcc

          const recipientsEmails = [...input.to, ...input.cc, ...input.bcc];
          const validRecipients = await ctx.db.email_person.findMany({
            where: { email: { in: recipientsEmails } },
          });
          // create email_person if not exists
          const mappedValidRecipients = validRecipients.map(
            (recipient) => recipient.email,
          );
          const newRecipients = recipientsEmails.filter(
            (recipient) => !mappedValidRecipients.includes(recipient),
          );
          const createdRecipients =
            await ctx.db.email_person.createManyAndReturn({
              data: newRecipients.map((recipient) => ({ email: recipient })),
            });
          const allRecipients = [...validRecipients, ...createdRecipients];

          const existingRecipientsIds = new Set(
            existingRecipients.map((recipient) => recipient.emailPersonId),
          );
          const newRecipientsIds = new Set(
            allRecipients.map((recipient) => recipient.id),
          );

          const recipientsToAdd = allRecipients.filter(
            (email) => !existingRecipientsIds.has(email.id),
          );

          const recipientsToRemove = existingRecipients.filter(
            (recipient) => !newRecipientsIds.has(recipient.emailPersonId),
          );

          if (recipientsToAdd.length > 0) {
            // Process in a batch instead of individual operations
            await ctx.db.emailToEmail.createMany({
              data: recipientsToAdd.map((recipient) => ({
                emailId: input.draftId!,
                emailPersonId: recipient.id,
                isTo: input.to.includes(recipient.email),
                isCc: input.cc.includes(recipient.email),
                isBcc: input.bcc.includes(recipient.email),
              })),
            });
          }

          if (recipientsToRemove.length > 0) {
            // Delete in a batch instead of individually
            await ctx.db.emailToEmail.deleteMany({
              where: {
                id: {
                  in: recipientsToRemove.map((r) => r.id),
                },
              },
            });
          }

          await emailHelper.updateDraft(input.draftId, {
            emailSubject: input.subject,
            emailContent: input.content,
            emailTo: input.to,
            emailCc: input.cc,
            emailBcc: input.bcc,
            emailFrom: userEmailPerson.email,
          });

          return { draft: updatedDraft };
        } catch (error) {
          console.error("Error saving draft:", error);
        }
      }
    }),

  getThreadById: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      const thread = await ctx.db.thread.findUnique({
        where: { id: input.threadId },
        include: {
          emails: {
            orderBy: {
              emailDate: "asc",
            },
            include: {
              sender: true,
              recipients: {
                select: {
                  emailPerson: true,
                  isTo: true,
                  isCc: true,
                  isBcc: true,
                  id: true,
                },
              },
              emailPdf: true,
              emailHtml: true,
              attachments: {
                include: {
                  file: true,
                },
              },
            },
          },
        },
      });
      return thread;
    }),

  createDraft: protectedProcedure
    .input(
      z.object({
        threadId: z.string().optional(),
        subject: z.string().optional().default(""),
        content: z.string().optional().default(""),
        to: z.array(z.string()).optional().default([]),
        cc: z.array(z.string()).optional().default([]),
        bcc: z.array(z.string()).optional().default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get the user's email_person record
      const userEmailPerson = await ctx.db.email_person.findFirst({
        where: {
          userId,
        },
      });

      if (!userEmailPerson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User email not found",
        });
      }
      try {
        const existingDraft = input.threadId
          ? await ctx.db.email.findFirst({
              where: {
                threadId: input.threadId,
              },
            })
          : null;
        if (existingDraft) {
          console.log("draft already exists");
          return existingDraft;
        }
        const createdGmailDraft = await emailHelper.createDraft({
          emailSubject: input.subject,
          emailContent: input.content,
          emailTo: input.to,
          emailCc: input.cc,
          emailBcc: input.bcc,
          emailFrom: "",
        });

        const existingRecipients = await ctx.db.emailToEmail.findMany({
          where: { emailId: createdGmailDraft.id ?? "" },
        });
        const recipientsEmails = [...input.to, ...input.cc, ...input.bcc];
        const validRecipients = await ctx.db.email_person.findMany({
          where: { email: { in: recipientsEmails } },
        });
        // create email_person if not exists
        const mappedValidRecipients = validRecipients.map(
          (recipient) => recipient.email,
        );
        const newRecipients = recipientsEmails.filter(
          (recipient) => !mappedValidRecipients.includes(recipient),
        );
        const createdRecipients =
          await ctx.db.email_person.createManyAndReturn({
            data: newRecipients.map((recipient) => ({ email: recipient })),
          });

        const allRecipients = [...validRecipients, ...createdRecipients];
        // Create a new draft
        const newDraft = await ctx.db.email.create({
          data: {
            id: createdGmailDraft.id ?? undefined,
            threadId: input.threadId ?? undefined,
            emailFromId: userEmailPerson.id,
            emailSubject: input.subject,
            emailContent: input.content,
            emailSnippet: "",
            labelIds: ["DRAFT"],
            emailDate: new Date(),
          },
          include: {
            sender: true,
            recipients: true,
          },
        });

        await ctx.db.emailToEmail.createMany({
          data: allRecipients.map((recipient) => ({
            emailId: createdGmailDraft.id ?? "",
            emailPersonId: recipient.id,
            isTo: input.to.includes(recipient.email),
            isCc: input.cc.includes(recipient.email),
            isBcc: input.bcc.includes(recipient.email),
          })),
        });
        return newDraft;
      } catch (error) {
        console.error("Error creating draft:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error creating draft",
        });
      }
    }),
  sendDraft: protectedProcedure
    .input(z.object({ draftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await emailHelper.init(userId);

      try {
        const email = await emailHelper.sendEmailDraft(input.draftId);
        if (!email) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Email not found",
          });
        }
        const parsedEmail = await emailHelper.formatEmail(email);
        const htmlDownloadKey = await s3Helper.uploadEmailHtmlToS3({
          messageId: email.id!,
          emailHtml: parsedEmail.html
            ? parsedEmail.html
            : parsedEmail.textAsHtml,
        });
        await ctx.db.email.update({
          where: { id: input.draftId },
          data: {
            id: email.id ?? undefined,
            labelIds: email.labelIds ?? ["SENT"],
            emailDate: email.internalDate
              ? moment(email.internalDate).toDate()
              : new Date(),
            emailSnippet: email.snippet ?? undefined,
            emailContent: parsedEmail.text,
          },
        });

        await ctx.db.file.create({
          data: {
            fileName: `email-${email.id}.html`,
            fileFormatType: FileFormatType.html,
            fileContentType: FileContent.email,
            fileSize: 0,
            downloadKey: htmlDownloadKey ?? undefined,
            emailIdForHtml: email.id,
          },
        });
        return { success: true };
      } catch (error) {
        console.error("Error sending draft:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error sending draft",
        });
      }
    }),
  updateEmailMetadata: protectedProcedure
    .input(
      z.object({
        emailIds: z.array(z.string()),
        labelsToAdd: z.array(z.string()).optional().default([]),
        labelsToRemove: z.array(z.string()).optional().default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const emails = await ctx.db.email.findMany({
        where: { id: { in: input.emailIds } },
      });
      if (!(emails.length > 0)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "emails are not found",
        });
      }
      for (const email of emails) {
        const newLabelIds = email.labelIds
          .filter((label) => !input.labelsToRemove.includes(label))
          .concat(input.labelsToAdd);
        await ctx.db.email.update({
          where: { id: email.id },
          data: {
            labelIds: [...new Set(newLabelIds)],
          },
        });
      }
      // invalidate cache
      const relatedKeys = await redisClient.smembers(`emailsFeed:${userId}`);
      for (const key of relatedKeys) {
        await redisClient.del(key);
      }
      return { success: true };
    }),
  getStarredEmails: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        search: z.string().optional().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      try {
        const starredEmails = await ctx.db.email.findMany({
          where: {
            AND: [
              {
                labelIds: {
                  has: "starred",
                },
              },
              {
                OR: [
                  {
                    recipients: {
                      some: { emailPerson: { userId } },
                    },
                  },
                  {
                    sender: {
                      userId,
                    },
                  },
                ],
              },
              {
                OR: [
                  {
                    emailSubject: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    emailContent: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    sender: {
                      OR: [
                        {
                          email: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          name: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                  {
                    recipients: {
                      some: {
                        emailPerson: { email: { contains: input.search } },
                      },
                    },
                  },
                ],
              },
            ],
          },
          include: {
            sender: true,
            recipients: {
              include: {
                emailPerson: true,
              },
            },
          },
          orderBy: {
            emailDate: "desc",
          },
          take: 50 + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
        });
        let nextCursor: string | undefined;
        if (starredEmails.length > 50) {
          const lastEmail = starredEmails.pop();
          nextCursor = lastEmail?.id;
        }
        return { starredEmails, nextCursor };
      } catch (error) {
        console.error("Error getting starred emails:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error getting starred emails",
        });
      }
    }),
  getStarredEmailsCount: protectedProcedure
    .input(z.object({ search: z.string().optional().default("") }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      try {
        const count = await ctx.db.email.count({
          where: {
            AND: [
              {
                labelIds: {
                  has: "starred",
                },
              },
              {
                OR: [
                  {
                    recipients: {
                      some: { emailPerson: { userId } },
                    },
                  },
                  {
                    sender: {
                      userId,
                    },
                  },
                ],
              },
              {
                OR: [
                  {
                    emailSubject: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    emailContent: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    sender: {
                      OR: [
                        {
                          email: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          name: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                  {
                    recipients: {
                      some: {
                        emailPerson: { email: { contains: input.search } },
                      },
                    },
                  },
                ],
              },
            ],
          },
        });
        return count;
      } catch (error) {
        console.error("Error getting starred emails count:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error getting starred emails count",
        });
      }
    }),
  syncRecentEmails: protectedProcedure
    .input(z.object({}).optional().default({}))
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      try {
        await emailHelper.init(userId);
        // Get historyId from Redis
        const historyId = await redisClient.get(`gmail-watch-${userId}`);
        if (!historyId) {
          // If no historyId is found, just return without syncing
          return { success: true };
        }
        // Call syncRecentEmails with the historyId
        await emailHelper.syncRecentEmails(historyId.toString(), userId);
        return { success: true };
      } catch (error) {
        console.error("Error syncing recent emails:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error syncing recent emails",
        });
      }
    }),
});
