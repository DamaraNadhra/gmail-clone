import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import moment from "~/utils/moment-adapter";
import { useRouter } from "next/router";
import { NumberParam, useQueryParams, withDefault } from "use-query-params";
import {
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Star,
  Inbox,
  Archive,
  Trash2,
  MailQuestion,
  MailOpen,
  Clock,
} from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import {
  TooltipContent,
  TooltipTrigger,
  Tooltip,
} from "~/components/ui/tooltip";
import { useSearch } from "~/components/GmailLayout";
import { Badge } from "~/components/ui/badge";
import { useSession } from "next-auth/react";
export default function EmailStarred() {
  const router = useRouter();
  const ctx = api.useUtils();
  const { data: session } = useSession();
  const user = session?.user;
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [starredEmails, setStarredEmails] = useState<string[]>([]);
  const [readEmails, setReadEmails] = useState<string[]>([]);

  const updateEmailMetadataMutation = api.email.updateEmailMetadata.useMutation({
    onSuccess: () => {
      void ctx.email.getStarredEmails.invalidate();
    },
  });

  const [page, setPage] = useQueryParams({
    page: withDefault(NumberParam, 1),
  });
  const { query } = useSearch();

  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage } =
    api.email.getStarredEmails.useInfiniteQuery(
      {
        search: query || "",
      },
      {
        enabled: !!user?.id,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const { data: countData } = api.email.getStarredEmailsCount.useQuery({
    search: query || "",
  });

  const toggleEmailSelection = (id: string) => {
    setSelectedEmails((prev) =>
      prev.includes(id)
        ? prev.filter((emailId) => emailId !== id)
        : [...prev, id],
    );
  };

  const toggleStarred = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const isStarred = starredEmails.includes(id);
    setStarredEmails((prev) =>
      prev.includes(id)
        ? prev.filter((emailId) => emailId !== id)
        : [...prev, id],
    );
    // save to db
    updateEmailMetadataMutation.mutateAsync({
      emailId: id,
      isStarred: !isStarred,
    });
  };

  const handleRead = (id: string) => {
    const isRead = readEmails.includes(id);
    setReadEmails((prev) =>
      prev.includes(id)
        ? prev.filter((emailId) => emailId !== id)
        : [...prev, id],
    );
    // save to db
    updateEmailMetadataMutation.mutateAsync({ emailId: id, isRead: !isRead });
  };

  const starredData = data?.pages[page.page - 1]?.starredEmails;

  useEffect(() => {
    setStarredEmails(starredData?.map((email) => email.id) || []);
    setReadEmails(
      starredData?.filter((email) => email.isRead).map((email) => email.id) ||
        [],
    );
  }, [starredData]);

  return (
    <div className="flex h-full flex-col rounded-lg bg-white">
      {/* Email toolbar */}
      <div className="flex w-full items-center border-b border-white p-2">
        <div className="ml-2 flex items-center gap-2">
          <div className="group relative rounded-full p-2">
            <Checkbox
              className="relative z-10"
              checked={selectedEmails.length === starredData?.length}
              onClick={() => {
                if (selectedEmails.length === starredData?.length) {
                  setSelectedEmails([]);
                } else {
                  setSelectedEmails(starredData?.map((email) => email.id) || []);
                }
              }}
            />
            <span className="absolute inset-0 scale-0 rounded-full bg-gray-100 transition-transform duration-300 ease-in group-hover:scale-150"></span>
          </div>
          <button
            className="rounded p-2 hover:bg-gray-100"
            onClick={() => {
              void ctx.email.fetchEmails.invalidate();
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
            {isLoading || isFetching || isFetchingNextPage
              ? "Loading..."
              : `${(page.page - 1) * 50 + 1}-${
                  starredData?.length
                    ? (page.page - 1) * 50 + starredData?.length
                    : 0
                } of ${countData || 0}`}
          </div>
          <button
            className="rounded p-2 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => {
              setPage((prev) => ({ page: prev.page - 1 }));
            }}
            disabled={isFetching || isFetchingNextPage || page.page === 1}
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            className="rounded p-2 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => {
              setPage((prev) => ({ page: prev.page + 1 }));
              fetchNextPage();
            }}
            disabled={isFetching || isFetchingNextPage || (starredData?.length || 0) + 50 * (page.page - 1) >= (countData || 0)}
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
        ) : !starredData?.length ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Inbox className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg text-gray-500">No emails found</p>
          </div>
        ) : (
          <Table>
            <TableBody>
              {starredData.map((email) => {
                const emailDate = moment(email.emailDate);
                const isSelected = selectedEmails.includes(email.id);
                const isStarred = starredEmails.includes(email.id);
                const isRead = readEmails.includes(email.id);
                const isInbox = email.recipients.some(
                  (recipient) => recipient.emailPerson.userId === user?.id,
                );
                return (
                  <TableRow
                    key={email.id}
                    className={`group transform cursor-pointer border-b border-gray-200 bg-white py-0 text-sm hover:relative hover:z-10 hover:scale-100 hover:border-gray-300 hover:shadow-md ${
                      isSelected ? "bg-blue-50" : isRead ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      if (!isRead) {
                        handleRead(email.id);
                      }
                      router.push(`/mail/${email.id}`);
                    }}
                  >
                    <TableCell className="w-72 p-1">
                      <div className="flex min-w-72 items-center gap-1 pl-4">
                        <div
                          className="group relative overflow-hidden rounded-full p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmailSelection(email.id);
                          }}
                        >
                          <Checkbox
                            className="relative z-10"
                            checked={isSelected}
                          />
                        </div>
                        <button
                          className="group relative overflow-hidden rounded-full p-2 text-gray-400 transition-colors duration-200 hover:bg-gray-100"
                          onClick={(e) => toggleStarred(e, email.id)}
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
                          {email.sender?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-full max-w-0 flex-1 overflow-hidden p-0 pr-2">
                      <div className="truncate">
                        {isInbox && <Badge variant="outline" className="mr-2 bg-gray-300 text-sm font-normal px-1">Inbox</Badge>}
                        <span
                          className={`${isRead ? "font-normal" : "font-semibold"} text-gray-800`}
                        >
                          {email.emailSubject ?? "(no subject)"}
                        </span>
                        <span className="ml-2 font-normal text-gray-500">
                          - {email.emailContent || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[6rem] whitespace-nowrap p-0 pr-4 text-right text-xs font-bold text-gray-700">
                      <div className="hidden gap-2 group-hover:flex group-hover:items-center group-hover:justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="rounded-full p-2 hover:bg-gray-100">
                              <Archive className="h-[18px] w-[18px] text-gray-700" />
                            </div>
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
                                  handleRead(email.id);
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
                                  handleRead(email.id);
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
    </div>
  );
}
