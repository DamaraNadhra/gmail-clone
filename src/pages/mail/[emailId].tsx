import { useRouter } from "next/router";
import EmailDetail from "~/components/EmailDetail";
import { CheerioHelper } from "~/lib/helpers/cheerioHelper";
import { api } from "~/utils/api";
export default function MailPage() {
  const router = useRouter();
  const { emailId } = router.query;
  const { data, isLoading } = api.email.getEmailById.useQuery({
    emailId: emailId as string,
  });
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (!data) {
    return <div>Email not found</div>;
  }
  return <EmailDetail emailId={emailId as string} />;
}
