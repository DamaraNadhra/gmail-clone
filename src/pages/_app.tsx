import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import NextAdapterPages from 'next-query-params';
import toast, { Toaster } from 'react-hot-toast';



import { api } from "~/utils/api";

import "~/styles/globals.css";
import { ClerkProvider, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import GmailLayout from "~/components/GmailLayout";
import { QueryParamProvider } from "use-query-params";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <ClerkProvider>
      <QueryParamProvider adapter={NextAdapterPages}>
        <div className={GeistSans.className}>
          <GmailLayout>
            <Component {...pageProps} />
            <Toaster />
          </GmailLayout>
        </div>
      </QueryParamProvider>
    </ClerkProvider>
  );
};

export default api.withTRPC(MyApp);
