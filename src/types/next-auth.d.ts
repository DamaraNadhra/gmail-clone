import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;  // Make sure `accessToken` is part of the session object
    user: {
      id: string;
      fullName: string;
      email: string;
      imageUrl: string;
    };
  }
}