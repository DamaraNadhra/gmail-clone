import axios from "axios";
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { google } from "googleapis";
import { db } from "~/server/db";
import { NextApiResponse } from "next";
import { NextApiRequest } from "next";
import { emailHelper } from "~/lib/buildHelpers";
import moment from "~/utils/moment-adapter";

export const authOptions = (
  req: NextApiRequest,
  res: NextApiResponse,
): NextAuthOptions => ({
  providers: [
    // Example provider: Google
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_CLIENT_ID!,
      clientSecret: process.env.AUTH_GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.modify",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
    // Add other providers here (GitHub, Facebook, etc.)
  ],
  // pages: {
  //   signIn: "/auth/signin", // Custom sign-in page if desired
  //   error: "/auth/error", // Optional error page
  // },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Here, check if the user is already in your database
      const existingUser = await db.user.findUnique({
        where: {
          email: user.email!,
        },
      });
      let existingUserId = existingUser?.id;
      if (!existingUser) {
        // create user
        const newUser = await db.user.create({
          data: {
            email: user.email!,
            fullName: user.name!,
            imageUrl: user.image!,
            provider: "google",
            googleScopes: [
              "https://www.googleapis.com/auth/userinfo.email",
              "https://www.googleapis.com/auth/userinfo.profile",
              "https://www.googleapis.com/auth/gmail.modify",
            ],
            email_person: {
              connectOrCreate: {
                where: {
                  name_email: {
                    name: user.name!,
                    email: user.email!,
                  },
                },
                create: {
                  name: user.name!,
                  email: user.email!,
                },
              },
            },
          },
        });
        existingUserId = newUser.id;
      }
      user.id = existingUserId!;
      account?.userId;
      return true;
    },
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        console.log("account", account);
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.refreshTokenExpiresIn = account.refresh_token_expires_in;
        token.refreshTokenDateIssued = new Date();
        token.accessTokenExpires =
          Date.now() + (account.expires_in as number) * 1000; // Convert to ms
        await db.user.update({
          where: { email: token.email! },
          data: { refreshToken: account.refresh_token },
        });
      }
      if (
        moment(token.refreshTokenDateIssued as Date)
          .add(token.refreshTokenExpiresIn as number, "seconds")
          .isBefore(moment())
      ) {
        // token has not expired, so we can use it
        console.log("Initializing email helper");
        await emailHelper.init(token.accessToken as string, token.refreshToken as string);
        return token;
      }
      // refresh token has expired, so we force the user to sign in again
      await emailHelper.init(token.accessToken as string, token.refreshToken as string);
      console.log("Refreshing token");
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.

      const user = await db.user.findUnique({
        where: { email: token.email! },
        select: { id: true, fullName: true, email: true, imageUrl: true }, // Only fetch user ID
      });
      if (user) {
        session.user = {
          id: user.id,
          fullName: user.fullName!,
          email: user.email!,
          imageUrl: user.imageUrl!,
        };
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET, // Make sure to set a secret in .env
  session: {
    strategy: "jwt",
  },
});

export default (req: NextApiRequest, res: NextApiResponse) => {
  return NextAuth(req, res, authOptions(req, res));
};
