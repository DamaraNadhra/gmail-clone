import axios from "axios";
import type { clerkClient } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { gmail, gmail_v1} from "@googleapis/gmail";
import { OAuth2Client} from "google-auth-library"

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
  private userId: string | null = null;
  private gmailClient: gmail_v1.Gmail;
  private oauth2Client: OAuth2Client;
  constructor(
    private client: Awaited<ReturnType<typeof clerkClient>>,
    private redisClient: Redis,
  ) {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.AUTH_GOOGLE_SECRET,
      process.env.OAUTH_GOOGLE_REDIRECT_URI,
    );
    this.gmailClient = gmail({ version: "v1", auth: this.oauth2Client });
  }
  /** 🔹 Initializes the OAuth token, but only if the user is logged in */
  async init(userId: string) {
    // Check if the user is logged in before proceeding
    const user = await this.client.users.getUser(userId);
    if (!user) {
      console.log("User not found or not logged in, skipping OAuth init.");
      return;
    }

    if (this.userId === userId && this.oauthToken) {
      // Token already exists, reuse it
      return;
    }

    this.userId = userId;
    const tokens = await this.client.users.getUserOauthAccessToken(
      user.id,
      "google",
    );

    if (!tokens || tokens.data.length === 0 || !tokens.data[0]?.token) {
      console.log("No OAuth tokens found for the user.");
      return;
    }

    this.oauthToken = tokens.data[0].token;
    this.oauth2Client.setCredentials({ access_token: this.oauthToken });
    this.gmailClient = gmail({ version: "v1", auth: this.oauth2Client });
  }

  /** 🔹 Fetches emails */
  async fetchEmails() {
    if (!this.oauthToken)
      throw new Error("OAuth token not initialized. Call init() first.");

    // const response = await axios.get(
    //   "https://www.googleapis.com/gmail/v1/users/me/messages",
    //   {
    //     headers: { Authorization: `Bearer ${this.oauthToken}` },
    //   },
    // );

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

  formatEmail(email: any) {
    const contents = this.getContent(email.payload);
    const cleanedContents = contents.map((item) => {
      const decodedContent = Buffer.from(item.content, "base64").toString(
        "utf-8",
      );
      return {
        type: item.type,
        content: decodedContent,
      };
    });
    function getEmailPerson(value: string): EmailPerson {
      return value
        .split(/[<>]/)
        .filter((item: string) => item !== "")
        .reduce(
          (acc: EmailPerson, curr: string) => {
            if (curr.includes("@")) {
              acc.email = curr.trim();
            } else {
              acc.name = curr.trim();
            }
            return acc;
          },
          { name: "", email: "" },
        );
    }
    const emailFrom = getEmailPerson(
      email.payload.headers.find(
        (header: any) => header.name === "From",
      )?.value,
    );
    const emailSubject = email.payload.headers.find(
      (header: any) => header.name === "Subject",
    )?.value;
    const emailTo = email.payload.headers
      .find((header: any) => header.name === "To")
      ?.value.split(",")
      .map(getEmailPerson);
    const emailDate = email.payload.headers.find(
      (header: any) => header.name === "Date",
    )?.value;
    const emailSnippet = email.snippet;
    return {
      id: email.id,
      emailFrom,
      emailSubject,
      emailTo,
      emailDate,
      emailSnippet,
      content: cleanedContents,
    };
  }

  /** 🔹 Fetches an email by its ID */
  async getEmailById(emailId: string) {
    if (!this.oauthToken)
      throw new Error("OAuth token not initialized. Call init() first.");

    try {
      const cachedEmail = await this.getEmailFromCache(emailId);
      if (cachedEmail) {
        console.log("Email found in cache");
        return cachedEmail;
      }
    } catch (err) {
      console.error("Redis cache error:", err);
      // Continue with fetching from Gmail API if cache fails
    }

    const response = await axios.get(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}`,
      {
        headers: { Authorization: `Bearer ${this.oauthToken}` },
      },
    );

    try {
      await this.cacheEmail(emailId, response.data);
    } catch (err) {
      console.error("Failed to cache email:", err);
      // Continue even if caching fails
    }

    return response.data;
  }

  async fetchEmailById(emailId: string) {
    const response = await this.gmailClient.users.messages.get({
      userId: "me",
      id: emailId,
      format: "raw"
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
  };

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

  private createRawMessage({ emailSubject, emailTo, emailFrom, emailContent, emailCc, emailBcc }: EmailDraftData) {
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

  async createDraft(emailData: EmailDraftData) {
    const rawMessage = this.createRawMessage(emailData);
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
    if (!this.oauthToken) {
      throw new Error("OAuth token not initialized. Call init() first.");
    }

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
      }
    });
    return response.data;
  }

  async deleteDraft(draftId: string) {
    const response = await this.gmailClient.users.drafts.delete({
      userId: "me",
      id: draftId,
    });
    return response.data;
  }
}
