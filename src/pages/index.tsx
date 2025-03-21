import Head from "next/head";
import { SignInButton, useUser } from "@clerk/nextjs";
import EmailInbox from "~/components/EmailInbox";
import GmailLayout, { useSearch } from "~/components/GmailLayout";
import Image from "next/image";

export default function Home() {
  const { isSignedIn, user } = useUser();
  const { query } = useSearch();
  return (
    <>
      <Head>
        <title>Gmail Clone</title>
        <meta
          name="description"
          content="A Gmail clone built with Next.js and tRPC"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {isSignedIn ? (
        <EmailInbox search={query} />
      ) : (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-center">
              <Image
                src={
                  "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_lockup_default_1x_r5.png"
                }
                alt="Gmail Logo"
                width={100}
                height={100}
              />
              <h1 className="text-4xl font-normal text-gray-900 dark:text-white">
                Gmail
              </h1>
            </div>

            <div className="rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
              <h2 className="mb-6 text-2xl font-normal text-gray-900 dark:text-white">
                Sign in
              </h2>
              <p className="mb-8 text-gray-600 dark:text-gray-400">
                Use your Google Account to access Gmail and other Google
                products
              </p>

              <SignInButton mode="modal">
                <button className="w-full rounded-md bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
