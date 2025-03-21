import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { clerkClient } from "@clerk/nextjs/server";
import axios from "axios";
import { Client, emailHelper, s3Helper } from "~/lib/buildHelpers";

interface EmailPerson {
  id: string;
  email: string;
}

export const emailRouter = createTRPCRouter({
  // Fetch emails
  fetchEmails: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        cursor: z.string().optional(),
        search: z.string().optional().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const emails = await ctx.db.email.findMany({
        where: {
          recipients: {
            some: {
              emailPerson: {
                userId: input.userId,
              },
            },
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
                email: {
                  contains: input.search,
                  mode: "insensitive",
                },
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
        include: {
          sender: true,
          recipients: true,
        },
        orderBy: {
          emailDate: "desc",
        },
        take: 50 + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
      });

      let nextCursor: string | undefined;
      if (emails.length > 50) {
        const lastEmail = emails.pop();
        nextCursor = lastEmail?.id;
      }

      return { emails, nextCursor };
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
      const drafts = await ctx.db.emailComposeDraft.findMany({
        where: {
          emailFromId: userEmailPerson.id,
          OR: [
            { emailSubject: { contains: input.search, mode: "insensitive" } },
            { emailContent: { contains: input.search, mode: "insensitive" } },
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
  getEmailDraftsCount: protectedProcedure.query(async ({ ctx }) => {
    const { currentUser } = ctx;
    if (!currentUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to get drafts",
      });
    }
    const userEmailPerson = await ctx.db.email_person.findFirst({
      where: { userId: currentUser },
    });
    if (!userEmailPerson) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User email not found",
      });
    }
    const count = await ctx.db.emailComposeDraft.count({
      where: { emailFromId: userEmailPerson.id },
    });
    return count;
  }),
  getUserEmailsCount: protectedProcedure.query(async ({ ctx }) => {
    const { currentUser } = ctx;
    if (!currentUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to get emails count",
      });
    }
    const count = await ctx.db.email.count({
      where: {
        recipients: {
          some: {
            emailPerson: {
              userId: currentUser,
            },
          },
        },
      },
    });
    return count;
  }),
  getEmailById: protectedProcedure
    .input(
      z.object({
        emailId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const s3response = await s3Helper.getFromS3(input.emailId);
      const emailHtml = s3response.parsedEmail.content.find(
        (c: any) => c.type === "html",
      ).content;
      const email = await ctx.db.email.findUnique({
        where: {
          id: input.emailId,
        },
        include: {
          recipients: true,
          sender: true,
        },
      });
      return {
        ...email,
        emailHtml,
      };
    }),

  // Get a draft by ID
  getDraftById: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { currentUser } = ctx;

      if (!currentUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to get drafts",
        });
      }

      // Get the user's email_person record
      const userEmailPerson = await ctx.db.email_person.findFirst({
        where: {
          user: {
            id: currentUser,
          },
        },
      });

      if (!userEmailPerson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User email not found",
        });
      }

      // Find the draft
      const draft = await ctx.db.emailComposeDraft.findUnique({
        where: { id: input.draftId },
        include: {
          recipients: {
            include: {
              emailPerson: true,
            },
          },
          sender: true,
        },
      });

      if (!draft) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Draft not found",
        });
      }

      // Check if the user owns this draft
      if (draft.emailFromId !== userEmailPerson.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to access this draft",
        });
      }

      return { draft };
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
      const { currentUser } = ctx;
      await emailHelper.init(currentUser);
      if (!currentUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to save drafts",
        });
      }

      // Get the user's email_person record
      const userEmailPerson = await ctx.db.email_person.findFirst({
        where: {
          userId: ctx.currentUser,
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
          await emailHelper.init(currentUser);
          const existingDraft = await ctx.db.emailComposeDraft.findUnique({
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
            updatedDraft = await ctx.db.emailComposeDraft.update({
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
            where: { composeDraftId: input.draftId },
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
                composeDraftId: input.draftId,
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
  createDraft: protectedProcedure
    .input(
      z.object({
        subject: z.string().optional().default(""),
        content: z.string().optional().default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { currentUser } = ctx;

      if (!currentUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to create drafts",
        });
      }

      // Get the user's email_person record
      const userEmailPerson = await ctx.db.email_person.findFirst({
        where: {
          userId: currentUser,
        },
      });

      if (!userEmailPerson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User email not found",
        });
      }
      try {
        await emailHelper.init(currentUser);
        const createdGmailDraft = await emailHelper.createDraft({
          emailSubject: input.subject,
          emailContent: input.content,
          emailTo: [],
          emailFrom: "",
        });

        // Create a new draft
        const newDraft = await ctx.db.emailComposeDraft.create({
          data: {
            id: createdGmailDraft.id || undefined,
            emailFromId: userEmailPerson.id,
            emailSubject: input.subject,
            emailContent: input.content,
          },
          include: {
            sender: true,
          },
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
      const { currentUser } = ctx;
      if (!currentUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to send drafts",
        });
      }
      try {
        await emailHelper.sendEmailDraft(input.draftId);
        await ctx.db.emailComposeDraft.delete({
          where: { id: input.draftId },
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
  toggleStarred: protectedProcedure
    .input(z.object({ emailId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { currentUser } = ctx;
      if (!currentUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to toggle starred",
        });
      }
      const email = await ctx.db.email.findUnique({
        where: { id: input.emailId },
      });
      if (!email) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Email not found",
        });
      }
      const isStarred = email.isStarred;
      await ctx.db.email.update({
        where: { id: input.emailId },
        data: { isStarred: !isStarred },
      });
      return { success: true };
    }),
  getStarredEmails: protectedProcedure
    .input(z.object({ cursor: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { currentUser } = ctx;
      if (!currentUser) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to get starred emails",
        });
      }
      try {
        const starredEmails = await ctx.db.email.findMany({
          where: {
            isStarred: true,
            recipients: { some: { emailPerson: { userId: currentUser } } },
          },
          include: {
            sender: true,
            recipients: true,
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
  getStarredEmailsCount: protectedProcedure.query(async ({ ctx }) => {
    const { currentUser } = ctx;
    if (!currentUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to get starred emails count",
      });
    }
    try {
      const count = await ctx.db.email.count({
        where: {
          isStarred: true,
          recipients: { some: { emailPerson: { userId: currentUser } } },
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
});
