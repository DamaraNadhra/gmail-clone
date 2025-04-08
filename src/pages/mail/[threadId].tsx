import { useRouter } from "next/router";
import EmailDetail from "~/components/ThreadDetail";
import { CheerioHelper } from "~/lib/helpers/cheerioHelper";
import { api } from "~/utils/api";
export default function MailPage() {
  const router = useRouter();
  const { threadId } = router.query;
  const { data, isLoading } = api.email.getThreadById.useQuery({
    threadId: threadId as string,
  });
  if (isLoading) {
    return <div className="flex h-full items-center justify-center bg-white rounded-xl">Loading...</div>;
  }
  if (!data) {
    return <div className="flex h-full items-center justify-center">Email not found</div>;
  }
  return <EmailDetail threadId={threadId as string} />;
}
