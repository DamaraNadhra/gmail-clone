import { useEffect, useState } from "react";
import { api } from "~/utils/api";
// import { useUser } from "@clerk/nextjs";
import moment from "~/utils/moment-adapter";
import { useRouter } from "next/router";
import useWebSocket from "react-use-websocket";
import { NumberParam, useQueryParams, withDefault } from "use-query-params";
import {
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Star,
  Trash2,
  Archive,
  MailOpen,
  Clock,
  MailQuestion,
  Inbox,
} from "lucide-react";

import { Checkbox } from "./ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useSession } from "next-auth/react";
import AttachmentCard from "./AttachmentPreviewCard";
import AttachmentPreviewModal from "./AttachmentPreviewModal";

export default function EmailInbox({ search }: { search: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const userId = user?.id;
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [starredEmails, setStarredEmails] = useState<string[]>([]);
  const [readEmails, setReadEmails] = useState<string[]>([]);
  const [attachmentModal, setAttachmentModal] = useState<{
    isOpen: boolean;
    url: string;
    fileType: string;
  }>({
    isOpen: false,
    url: "",
    fileType: "",
  });
  const [page, setPage] = useQueryParams({
    page: withDefault(NumberParam, 1),
  });
  const ctx = api.useUtils();
  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = api.email.fetchEmails.useInfiniteQuery(
    {
      userId: userId!,
      search,
    },
    {
      enabled: !!userId,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const { data: countData } = api.email.getUserEmailsCount.useQuery({
    search: search || "",
  });
  const updateEmailMetadataMutation = api.email.updateEmailMetadata.useMutation(
    {
      onSuccess: () => {
        void ctx.email.invalidate();
      },
    },
  );
  const syncRecentEmailsMutation = api.email.syncRecentEmails.useMutation({
    onSuccess: () => {
      void ctx.email.invalidate();
    },
  });
  const toggleEmailSelection = (id: string) => {
    setSelectedEmails((prev) =>
      prev.includes(id)
        ? prev.filter((emailId) => emailId !== id)
        : [...prev, id],
    );
  };

  const threads = data?.pages[page.page - 1]?.threads;

  const toggleStarred = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isStarred = starredEmails.includes(id);
    setStarredEmails((prev) =>
      prev.includes(id)
        ? prev.filter((emailId) => emailId !== id)
        : [...prev, id],
    );
    const emails = threads?.find((thread) => thread.id === id)?.emails.filter(
      (email) => isStarred ? !email.labelIds.includes("STARRED") : email.labelIds.includes("STARRED"),
    );
    // save to db
    updateEmailMetadataMutation.mutateAsync({
      emailIds: emails?.map((email) => email.id) || [],
      ...(isStarred ? { labelsToRemove: ["STARRED"] } : { labelsToAdd: ["STARRED"] }),
    });
  };

  const handleRead = (id: string) => {
    const isRead = readEmails.includes(id);
    setReadEmails((prev) =>
      prev.includes(id)
        ? prev.filter((threadId) => threadId !== id)
        : [...prev, id],
    );
    // save to db
    const emails = threads?.find((thread) => thread.id === id)?.emails.filter(
      (email) => isRead ? !email.labelIds.includes("UNREAD") : email.labelIds.includes("UNREAD"),
    );
    updateEmailMetadataMutation.mutateAsync({
      emailIds: emails?.map((email) => email.id) || [],
      ...(isRead ? { labelsToAdd: ["UNREAD"] } : { labelsToRemove: ["UNREAD"] }),
    });
  };

  const handleArchive = (id: string) => {
    const emails = threads?.find((thread) => thread.id === id)?.emails.filter(
      (email) => email.labelIds.includes("INBOX"),
    );
    updateEmailMetadataMutation.mutateAsync({
      emailIds: emails?.map((email) => email.id) || [],
      labelsToRemove: ["INBOX"],
    });
  };

  useEffect(() => {
    // update starred emails
    setStarredEmails(
      threads
        ?.filter((thread) =>
          thread.emails.every((email) => email.labelIds.includes("STARRED")),
        )
        .map((thread) => thread.id) || [],
    );
    // update read emails
    setReadEmails(
      threads
        ?.filter((thread) =>
          thread.emails.every((email) => !email.labelIds.includes("UNREAD")),
        )
        .map((thread) => thread.id) || [],
    );
  }, [threads]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001"); // 🔁 Make sure this URL is correct

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    ws.onmessage = (event) => {
      console.log("📨 Received:", event.data);
      ctx.email.invalidate();
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };

    ws.onclose = () => {
      console.warn("⚠️ WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);
  return (
    <div className="flex h-full flex-col rounded-lg bg-white">
      {/* Email toolbar */}
      <div className="flex w-full items-center border-b border-white p-2">
        <div className="ml-2 flex items-center gap-2">
          <div className="group relative rounded-full p-2">
            <Checkbox
              className="relative z-10"
              checked={selectedEmails.length === threads?.length}
              onClick={() => {
                if (selectedEmails.length === threads?.length) {
                  setSelectedEmails([]);
                } else {
                  setSelectedEmails(threads?.map((thread) => thread.id) || []);
                }
              }}
            />
            <span className="absolute inset-0 scale-0 rounded-full bg-gray-100 transition-transform duration-300 ease-in group-hover:scale-150"></span>
          </div>
          <button
            className="rounded p-2 hover:bg-gray-100"
            onClick={() => {
              syncRecentEmailsMutation.mutateAsync();
            }}
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
          <button className="rounded p-2 hover:bg-gray-100">
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-sm text-gray-600">
            {isLoading || isFetchingNextPage
              ? "Loading..."
              : `${(page.page - 1) * 50 + 1}-${
                  threads?.length ? (page.page - 1) * 50 + threads?.length : 0
                } of ${countData || 0}`}
          </div>
          <button
            className="rounded p-2 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => {
              setPage((prev) => ({ page: prev.page - 1 }));
            }}
            disabled={isFetchingNextPage || page.page === 1}
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            className="rounded p-2 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => {
              setPage((prev) => ({ page: prev.page + 1 }));
              fetchNextPage();
            }}
            disabled={
              isFetchingNextPage ||
              (threads?.length || 0) + 50 * (page.page - 1) >= (countData || 0)
            }
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-auto">
        {isLoading || isFetchingNextPage ? (
          // Skeleton loading
          Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center border-b border-gray-200 bg-white px-4 py-2 hover:shadow-sm"
            >
              <div className="flex w-72 items-center gap-4">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
              </div>
              <div className="flex-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
              </div>
              <div className="w-24 text-right">
                <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200"></div>
              </div>
            </div>
          ))
        ) : !threads?.length ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Inbox className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg text-gray-500">No emails found</p>
          </div>
        ) : (
          <Table>
            <TableBody>
              {threads.map((thread) => {
                const emailDate = moment(thread.threadDate);
                const isSelected = selectedEmails.includes(thread.id);
                const senders = thread.emails
                  .map((email) => {
                    if (email.sender?.name === user?.fullName) {
                      return "Me";
                    } else {
                      return email.sender?.name || email.sender?.email;
                    }
                  });
                const isStarred = starredEmails.includes(thread.id);
                const isRead = readEmails.includes(thread.id);
                return (
                  <TableRow
                    key={thread.id}
                    className={`group transform cursor-pointer border-b border-gray-200 bg-white py-0 text-sm hover:relative hover:z-10 hover:scale-100 hover:border-gray-300 hover:shadow-md ${
                      isSelected ? "bg-blue-50" : isRead ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      if (!isRead) {
                        handleRead(thread.id);
                      }
                      router.push(`/mail/${thread.id}`);
                    }}
                  >
                    <TableCell className="w-72 p-1">
                      <div className="flex min-w-72 items-center gap-1 pl-4">
                        <div
                          className="group relative overflow-hidden rounded-full p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmailSelection(thread.id);
                          }}
                        >
                          <Checkbox
                            className="relative z-10"
                            checked={isSelected}
                          />
                        </div>
                        <button
                          className="group relative overflow-hidden rounded-full p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100"
                          onClick={(e) => toggleStarred(e, thread.id)}
                        >
                          <Star
                            className={`relative z-10 h-4 w-4 transition-colors duration-200 ${
                              isStarred ? "fill-yellow-500 text-yellow-500" : ""
                            }`}
                          />
                        </button>
                        <span
                          className={`${isRead ? "font-normal" : "font-semibold"} text-gray-800`}
                        >
                          {Array.from(new Set(senders)).join(", ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-full max-w-0 flex-1 space-y-2 p-1 pr-2">
                      <div className="truncate">
                        <span
                          className={`${isRead ? "font-normal" : "font-semibold"} text-gray-800`}
                        >
                          {thread?.emails?.[0]?.emailSubject ?? "(no subject)"}
                        </span>
                        <span className="ml-2 font-normal text-gray-500">
                          - {thread?.snippet || ""}
                        </span>
                      </div>
                      {thread?.emails.some((email) => email.emailPdf) && (
                        <div className="flex flex-wrap gap-2">
                          {thread?.emails.map((email) => (
                            <>
                              {email.emailPdf && (
                                <AttachmentCard
                                  key={email.id}
                                  fileName={email.emailPdf?.fileName}
                                  url={email.emailPdf?.downloadKey}
                                  mimeType={email.emailPdf?.fileFormatType}
                                  variant="preview"
                                  onClick={() => {
                                    setAttachmentModal({
                                      isOpen: true,
                                      url: email.emailPdf!.downloadKey,
                                      fileType: email.emailPdf!.fileFormatType,
                                    });
                                  }}
                                />
                              )}
                            </>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="min-w-[6rem] whitespace-nowrap p-0 pr-4 text-right text-xs font-bold text-gray-700">
                      <div className="hidden gap-2 group-hover:flex group-hover:items-center group-hover:justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="rounded-full p-2 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(thread.id);
                              }}
                            >
                              <Archive className="h-[18px] w-[18px] text-gray-700" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Archive</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-full p-2 hover:bg-gray-100">
                              <Trash2 className="h-[18px] w-[18px] text-gray-700" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete</p>
                          </TooltipContent>
                        </Tooltip>
                        {isRead ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="rounded-full p-2 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRead(thread.id);
                                }}
                              >
                                <MailQuestion className="h-[18px] w-[18px] text-gray-700" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mark as unread</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="rounded-full p-2 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRead(thread.id);
                                }}
                              >
                                <MailOpen className="h-[18px] w-[18px] text-gray-700" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Mark as read</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-full p-2 hover:bg-gray-100">
                              <Clock className="h-[18px] w-[18px] text-gray-700" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Snooze</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div
                        className={`group-hover:hidden ${isRead ? "text-gray-500" : "text-gray-800"}`}
                      >
                        {emailDate.isSame(moment(), "day")
                          ? emailDate.format("h:mm A")
                          : emailDate.isSame(moment(), "year")
                            ? emailDate.format("MMM D")
                            : emailDate.format("MM/DD/YY")}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
