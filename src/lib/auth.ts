import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next"
import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import { authOptions } from "~/pages/api/auth/[...nextauth]"
// You'll need to import and pass this
// to `NextAuth` in `app/api/auth/[...nextauth]/route.ts`

// Use it in server contexts
export async function auth(context: {
  req: GetServerSidePropsContext["req"] | NextApiRequest;
  res: GetServerSidePropsContext["res"] | NextApiResponse;
}) {
  return getServerSession(
    context.req as NextApiRequest,
    context.res as NextApiResponse,
    authOptions(context.req as NextApiRequest, context.res as NextApiResponse)
  )
}