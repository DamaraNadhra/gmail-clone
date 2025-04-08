import { Email, email_person, email_attachment, file } from "@prisma/client";
import { MoreVertical, Forward, Printer, Star, Reply } from "lucide-react";
import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

import moment from "~/utils/moment-adapter";
import AttachmentCard from "./AttachmentPreviewCard";
import { useSession } from "next-auth/react";

export function EmailDetailsRow({
  email,
  setAttachmentModal,
  expandable = true,
}: {
  email: any;
  setAttachmentModal: ({
    isOpen,
    url,
    fileType,
  }: {
    isOpen: boolean;
    url: string;
    fileType: string;
  }) => void;
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [htmlContent, setHtmlContent] = useState("");
  useEffect(() => {
    fetch(`${email.emailHtml?.downloadKey}`)
      .then((res) => res.text())
      .then(setHtmlContent);
  }, []);

  const { data: session } = useSession();
  const user = session?.user;

  const getParticipantName = (participant: email_person) => {
    if (participant.name) {
      return participant.name;
    }
    return participant.email.split("@")[0];
  };

  return (
    <>
      <div className="space-y-4 border-b border-gray-200 pb-4">
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300">
              <div className="flex h-full w-full items-center justify-center bg-blue-500 text-lg text-white">
                {email.sender?.name?.[0] || "?"}
              </div>
            </div>
            <div
              className={`flex ${
                expandable ? "cursor-pointer" : "cursor-default"
              } flex-col`}
              onClick={() => {
                if (expandable) {
                  setExpanded(!expanded);
                }
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {email.sender?.name || email.sender?.email || "Unknown"}
                  </span>
                  {expanded && (
                    <span className="text-[12px] text-gray-500">
                      &lt;{email.sender?.email || ""}&gt;
                    </span>
                  )}
                </div>
              </div>
              {expanded ? (
                <div className="flex text-xs text-gray-500">
                  To{" "}
                  {email.recipients
                    .map((r: any) =>
                      r.emailPerson.email === user?.email
                        ? "Me"
                        : getParticipantName(r.emailPerson),
                    )
                    .join(", ")}{" "}
                  ▾
                </div>
              ) : (
                <div className="text-sm font-[300] text-gray-600">
                  {email.emailSnippet}
                </div>
              )}
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
        </div>

        {/* Email body - in a real app, you'd use a sanitized HTML renderer */}
        {expanded && (
          <>
            <div className="prose max-w-none text-sm">
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(htmlContent),
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {email.attachments?.map((attachment: any) => (
                <AttachmentCard
                  key={attachment.file.id}
                  variant="snippet"
                  fileName={attachment.file?.fileName}
                  mimeType={attachment.file?.fileFormatType}
                  url={attachment.file?.downloadKey}
                  onClick={() => {
                    console.log(attachment.file.fileFormatType);
                    setAttachmentModal({
                      isOpen: true,
                      url: attachment.file.downloadKey,
                      fileType: attachment.file.fileFormatType,
                    });
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
