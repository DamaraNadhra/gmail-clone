import { useEffect, useState } from "react";
import { api } from "~/utils/api";
import { useUser } from "@clerk/nextjs";
import moment from "~/utils/moment-adapter";
import { useRouter } from "next/router";
import { NumberParam, useQueryParams, withDefault } from "use-query-params";
import {
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Star,
  Archive,
  Trash2,
  Mail,
  Clock,
  Tag,
  Inbox,
} from "lucide-react";
import {
  rippleEffect,
  checkboxRippleEffect,
} from "~/lib/helpers/animationHelper";
import { Checkbox } from "./ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { z } from "zod";

export default function EmailInbox({
  search,
}: {
  search: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [starredEmails, setStarredEmails] = useState<string[]>([]);

  const [page, setPage] = useQueryParams({
    page: withDefault(NumberParam, 1),
  });

  const { data, isLoading, isFetching, isFetchingNextPage,
     fetchNextPage, hasNextPage } =
    api.email.fetchEmails.useInfiniteQuery(
      {
        userId: user?.id!,
        search,
      },
      {
        enabled: !!user?.id,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const { data: countData } = api.email.getUserEmailsCount.useQuery();
  const toggleStarredMutation = api.email.toggleStarred.useMutation();

  const toggleEmailSelection = (id: string) => {
    setSelectedEmails((prev) =>
      prev.includes(id)
        ? prev.filter((emailId) => emailId !== id)
        : [...prev, id],
    );
  };

  const toggleStarred = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredEmails((prev) =>
      prev.includes(id)
        ? prev.filter((emailId) => emailId !== id)
        : [...prev, id],
    );
    // save to db
    toggleStarredMutation.mutateAsync({ emailId: id });
  };

  const emailData = data?.pages[page.page - 1]?.emails;

  useEffect(() => {
    // update starred emails
    setStarredEmails(emailData?.filter((email) => email.isStarred).map((email) => email.id) || []);
  }, [emailData]);

  return (
    <div className="flex h-full flex-col rounded-lg bg-white">
      {/* Email toolbar */}
      <div className="flex w-full items-center border-b border-white p-2">
        <div className="ml-2 flex items-center gap-2">
          <div className="group relative rounded-full p-2">
            <Checkbox
              className="relative z-10"
              checked={selectedEmails.length === emailData?.length}
              onClick={() => {
                if (selectedEmails.length === emailData?.length) {
                  setSelectedEmails([]);
                } else {
                  setSelectedEmails(emailData?.map((email) => email.id) || []);
                }
              }}
            />
            <span className="absolute inset-0 scale-0 rounded-full bg-gray-100 transition-transform duration-300 ease-out group-hover:scale-150"></span>
          </div>
          <button className="rounded p-2 hover:bg-gray-100">
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
                  emailData?.length
                    ? (page.page - 1) * 50 + emailData?.length
                    : 0
                } of ${countData || 0}`}
          </div>
          <button
            className="rounded p-2 hover:bg-gray-100"
            onClick={() => {
              setPage((prev) => ({ page: prev.page - 1 }));
            }}
            disabled={isFetching || isFetchingNextPage}
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <button
            className="rounded p-2 disabled:opacity-50 disabled:hover:bg-transparent hover:bg-gray-100"
            onClick={() => {
              setPage((prev) => ({ page: prev.page + 1 }));
              fetchNextPage();
            }}
            disabled={isFetching || isFetchingNextPage }
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-auto">
        {isLoading || isFetching || isFetchingNextPage ? (
          // Skeleton loading
          Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center border-b border-gray-200 bg-white px-4 py-2 hover:shadow-sm"
            >
              <div className="flex w-60 items-center gap-4">
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
        ) : !emailData?.length ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Inbox className="h-16 w-16 text-gray-300" />
            <p className="mt-4 text-lg text-gray-500">No emails found</p>
          </div>
        ) : (
          <Table>
            <TableBody>
              {emailData.map((email, index) => {
                const emailDate = moment(email.emailDate);
                const isSelected = selectedEmails.includes(email.id);
                const isStarred = starredEmails.includes(email.id);

                return (
                  <TableRow
                    key={email.id}
                    className={`cursor-pointer border-b border-gray-100 bg-white py-0 text-sm hover:z-10 hover:shadow-lg mb-2 ${
                      isSelected
                        ? "bg-blue-50"
                        : email.isRead
                          ? ""
                          : "font-semibold"
                    }`}
                    onClick={() => router.push(`/mail/${email.id}`)}
                  >
                    <TableCell className="flex w-72 items-center gap-1 p-1 pl-4 hover:shadow-lg">
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
                        <span className="absolute inset-0 scale-0 rounded-full bg-gray-200 transition-transform duration-300 ease-out group-hover:scale-150"></span>
                      </div>
                      <button
                        className="group relative overflow-hidden rounded-full p-2 text-gray-400"
                        onClick={(e) => toggleStarred(e, email.id)}
                      >
                        <Star
                          className={`relative z-10 h-4 w-4 transition-colors duration-200 ${
                            isStarred ? "fill-yellow-500 text-yellow-500" : ""
                          }`}
                        />
                        <span className="absolute inset-0 scale-0 rounded-full bg-gray-200 transition-transform duration-300 ease-out group-hover:scale-150"></span>
                      </button>
                      <span
                        className={
                          email.isRead
                            ? "text-gray-700"
                            : "font-semibold text-gray-800"
                        }
                      >
                        {email.sender?.name || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="w-full max-w-0 flex-1 p-1 pr-2">
                      <div className="truncate">
                        {!email.isRead && (
                          <span className="font-semibold text-gray-800">
                            {email.emailSubject}
                          </span>
                        )}
                        {email.isRead && (
                          <span className="text-gray-700">
                            {email.emailSubject}
                          </span>
                        )}
                        <span className="ml-2 font-normal text-gray-500">
                          - {email.emailSnippet || ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="w-24 min-w-[6rem] whitespace-nowrap pr-4 text-right text-sm text-gray-500">
                      {emailDate.isSame(moment(), "day")
                        ? emailDate.format("h:mm A")
                        : emailDate.isSame(moment(), "year")
                          ? emailDate.format("MMM D")
                          : emailDate.format("MM/DD/YY")}
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
