import { useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "@clerk/nextjs";
import { api } from "~/utils/api";
import moment from "~/utils/moment-adapter";
import DOMPurify from 'dompurify';
import {
  ArrowLeft,
  Archive,
  Trash2,
  Clock,
  Tag,
  MoreVertical,
  Star,
  Reply,
  Forward,
  Printer,
  CornerUpRight,
} from "lucide-react";
interface EmailDetailProps {
  emailId?: string;
}

export default function EmailDetail({ emailId }: EmailDetailProps) {
  const router = useRouter();
  const { user } = useUser();
  const [showFullHeaders, setShowFullHeaders] = useState(false);

  // This would be replaced with actual data fetching
  const { data: email, isLoading } = api.email.getEmailById.useQuery(
    {
      emailId: emailId || "",
    },
    {
      enabled: !!emailId && !!user?.id,
    },
  );

  const goBack = () => {
    router.push("/");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Email toolbar */}
      <div className="flex items-center border-b border-gray-200 p-2">
        <div className="flex items-center gap-2">
          <button className="rounded p-2 hover:bg-gray-100" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button className="rounded p-2 hover:bg-gray-100">
            <Archive className="h-4 w-4 text-gray-600" />
          </button>
          <button className="rounded p-2 hover:bg-gray-100">
            <Trash2 className="h-4 w-4 text-gray-600" />
          </button>
          <button className="rounded p-2 hover:bg-gray-100">
            <Clock className="h-4 w-4 text-gray-600" />
          </button>
          <button className="rounded p-2 hover:bg-gray-100">
            <Tag className="h-4 w-4 text-gray-600" />
          </button>
          <button className="rounded p-2 hover:bg-gray-100">
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          // Skeleton loading
          <div className="animate-pulse">
            <div className="mb-6">
              <div className="mb-2 h-8 w-3/4 rounded bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="mb-1 h-5 w-48 rounded bg-gray-200"></div>
                  <div className="h-4 w-32 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-gray-200"></div>
              <div className="h-4 w-full rounded bg-gray-200"></div>
              <div className="h-4 w-3/4 rounded bg-gray-200"></div>
              <div className="h-4 w-5/6 rounded bg-gray-200"></div>
              <div className="h-4 w-full rounded bg-gray-200"></div>
            </div>
          </div>
        ) : !email ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-lg text-gray-500">Email not found</p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h1 className="mb-4 text-2xl font-normal text-gray-900">
                {email.emailSubject}
              </h1>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300">
                  <div className="flex h-full w-full items-center justify-center bg-blue-500 text-white">
                    {email.sender?.name?.[0] || "?"}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {email.sender?.name || email.sender?.email || "Unknown"}
                    </span>
                    <span className="text-sm text-gray-500">
                      &lt;{email.sender?.email || ""}&gt;
                    </span>
                    <button className="ml-2 text-gray-400 hover:text-yellow-500">
                      <Star className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>
                      {moment(email.emailDate).format(
                        "ddd, MMM D, YYYY, h:mm A",
                      )}
                    </span>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => setShowFullHeaders(!showFullHeaders)}
                    >
                      {showFullHeaders ? "Hide details" : "Show details"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded p-1 hover:bg-gray-100">
                    <Reply className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded p-1 hover:bg-gray-100">
                    <Forward className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded p-1 hover:bg-gray-100">
                    <Printer className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="rounded p-1 hover:bg-gray-100">
                    <MoreVertical className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {showFullHeaders && (
                <div className="mt-4 rounded bg-gray-50 p-3 text-xs text-gray-600">
                  <div>
                    <strong>From:</strong> {email.sender?.email}
                  </div>
                  <div>
                    <strong>To:</strong>{" "}
                    {email.recipients
                      ?.filter((r: any) => r.isTo)
                      .map((r: any) => r.emailPersonId)
                      .join(", ")}
                  </div>
                  {email.recipients?.some((r: any) => r.isCc) && (
                    <div>
                      <strong>Cc:</strong>{" "}
                      {email.recipients
                        .filter((r: any) => r.isCc)
                        .map((r: any) => r.emailPersonId)
                        .join(", ")}
                    </div>
                  )}
                  <div>
                    <strong>Date:</strong>{" "}
                    {moment(email.emailDate).format("ddd, MMM D, YYYY, h:mm A")}
                  </div>
                  <div>
                    <strong>Subject:</strong> {email.emailSubject}
                  </div>
                </div>
              )}
            </div>

            {/* Email body - in a real app, you'd use a sanitized HTML renderer */}
            <div className="prose max-w-none">
              {/* For skeleton UI, we'll just show the content as text */}
              <div
                dangerouslySetInnerHTML={{
                  __html:
                    DOMPurify.sanitize(email.emailHtml || "") 
                }}
              />
            </div>

            {/* Reply buttons */}
            <div className="mt-6 flex gap-4">
              <button className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                <Reply className="h-4 w-4" />
                Reply
              </button>
              <button className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                <Forward className="h-4 w-4" />
                Forward
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
