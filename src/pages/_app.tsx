import { GeistSans } from "geist/font/sans";
import { type AppType } from "next/app";
import { ReactRouter6Adapter } from "use-query-params/adapters/react-router-6";
import NextAdapterPages from "next-query-params";
import toast, { Toaster } from "react-hot-toast";
import { SessionProvider } from "next-auth/react";
import { api } from "~/utils/api";

import "~/styles/globals.css";
import GmailLayout from "~/components/GmailLayout";
import { QueryParamProvider } from "use-query-params";
import { TooltipProvider } from "~/components/ui/tooltip";
import { Session } from "next-auth";

const MyApp: AppType<{ session: Session }> = ({ Component, pageProps }) => {
  return (
      <SessionProvider session={pageProps.session}>
        <QueryParamProvider adapter={NextAdapterPages}>
          <div className={GeistSans.className}>
            <TooltipProvider>
              <GmailLayout>
              <Component {...pageProps} />
              <Toaster />
            </GmailLayout>
          </TooltipProvider>
          </div>
        </QueryParamProvider>
      </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
