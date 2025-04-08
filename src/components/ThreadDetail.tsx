import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "~/utils/api";
import moment from "~/utils/moment-adapter";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Archive,
  Trash2,
  Clock,
  Tag,
  MoreVertical,
  Reply,
  Forward,
} from "lucide-react";
import { useSession } from "next-auth/react";
import AttachmentPreviewModal from "./AttachmentPreviewModal";
import { EmailDetailsRow } from "./EmailDetailsRow";
import ComposeEmail from "./ComposeEmail";

interface ThreadDetailProps {
  threadId?: string;
}

export default function ThreadDetail({ threadId }: ThreadDetailProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showFullHeaders, setShowFullHeaders] = useState(false);
  const [showReplyCompose, setShowReplyCompose] = useState(false);
  const [minimizeReply, setMinimizeReply] = useState(false);
  const [replyDraftId, setReplyDraftId] = useState<string | null>(null);
  const [attachmentModal, setAttachmentModal] = useState({
    isOpen: false,
    fileType: "",
    url: "",
  });

  // This would be replaced with actual data fetching
  const { data: thread, isLoading } = api.email.getThreadById.useQuery(
    {
      threadId: threadId || "",
    },
    {
      enabled: !!threadId && !!session?.user.id,
    },
  );

  const createDraftMutation = api.email.createDraft.useMutation();

  const handleReply = async () => {
    if (!thread?.emails?.[0]) return;

    const originalEmail = thread.emails[0];
    const draft = await createDraftMutation.mutateAsync({
      subject: `Re: ${originalEmail.emailSubject}`,
      content: "",
    });

    setReplyDraftId(draft.id);
    setShowReplyCompose(true);
  };

  const goBack = () => {
    router.push("/");
  };

  return (
    <div className="flex h-full flex-col rounded-xl bg-white p-2">
      {/* Email toolbar */}
      <div className="flex items-center p-2">
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
        ) : !thread ? (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-lg text-gray-500">Email not found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {thread.emails.map((email) => (
              <EmailDetailsRow
                key={email.id}
                email={email}
                setAttachmentModal={setAttachmentModal}
                expandable={thread.emails.length > 1}
              />
            ))}
            {/* Reply buttons */}
            {showReplyCompose ? (
              <ComposeEmail
                onClose={() => {
                  setShowReplyCompose(false);
                  setReplyDraftId(null);
                }}
                variant="reply"
                minimized={minimizeReply}
                onMinimize={() => setMinimizeReply(!minimizeReply)}
                onMaximize={() => setMinimizeReply(false)}
                existingDraftId={replyDraftId || undefined}
              />
            ) : (
              <div className="mt-6 flex gap-4">
                <button
                  className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  onClick={handleReply}
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
                <button className="flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  <Forward className="h-4 w-4" />
                  Forward
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <AttachmentPreviewModal
        isOpen={attachmentModal.isOpen}
        onClose={() =>
          setAttachmentModal({ isOpen: false, url: "", fileType: "" })
        }
        url={attachmentModal.url}
        fileType={attachmentModal.fileType}
      />
    </div>
  );
}
