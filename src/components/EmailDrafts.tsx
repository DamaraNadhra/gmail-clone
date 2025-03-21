import { useState } from "react";
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
  Inbox,
} from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import ComposeEmail from "./ComposeEmail";

export default function EmailDrafts() {
  const router = useRouter();
  const { user } = useUser();
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [starredDrafts, setStarredDrafts] = useState<string[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [minimizeCompose, setMinimizeCompose] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [page, setPage] = useQueryParams({
    page: withDefault(NumberParam, 1),
  });

  const { data, isLoading, isFetching, isFetchingNextPage, fetchNextPage } =
    api.email.getDrafts.useInfiniteQuery(
      {
        userId: user?.id!,
      },
      {
        enabled: !!user?.id,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const { data: countData } = api.email.getEmailDraftsCount.useQuery();

  const toggleEmailSelection = (id: string) => {
    setSelectedDrafts((prev) =>
      prev.includes(id)
        ? prev.filter((draftId) => draftId !== id)
        : [...prev, id],
    );
  };

  const toggleStarred = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarredDrafts((prev) =>
      prev.includes(id)
        ? prev.filter((draftId) => draftId !== id)
        : [...prev, id],
    );
  };

  const draftData = data?.pages[page.page - 1]?.drafts;

  return (
    <>
      <div className="flex h-full flex-col rounded-lg bg-white">
        {/* Email toolbar */}
        <div className="flex w-full items-center border-b border-white p-2">
          <div className="ml-2 flex items-center gap-2">
            <div className="group relative rounded-full p-1">
              <Checkbox
                className="relative z-10"
                checked={selectedDrafts.length === draftData?.length}
                onClick={() => {
                  if (selectedDrafts.length === draftData?.length) {
                    setSelectedDrafts([]);
                  } else {
                    setSelectedDrafts(
                      draftData?.map((draft) => draft.id) || [],
                    );
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
                    draftData?.length
                      ? (page.page - 1) * 50 + draftData?.length
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
              className="rounded p-2 hover:bg-gray-100"
              onClick={() => {
                setPage((prev) => ({ page: prev.page + 1 }));
                fetchNextPage();
              }}
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
          ) : !draftData?.length ? (
            <div className="flex h-full flex-col items-center justify-center">
              <Inbox className="h-16 w-16 text-gray-300" />
              <p className="mt-4 text-lg text-gray-500">No drafts found</p>
            </div>
          ) : (
            <Table>
              <TableBody>
                {draftData.map((draft) => {
                  const draftDate = moment(draft.createdAt);
                  const isSelected = selectedDrafts.includes(draft.id);
                  const isStarred = starredDrafts.includes(draft.id);

                  return (
                    <TableRow
                      key={draft.id}
                      className={`cursor-pointer border-b border-gray-100 bg-white py-0 text-sm hover:bg-gray-50 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                      onClick={() => {
                        setDraftId(draft.id);
                        setShowCompose(true);
                      }}
                    >
                      <TableCell className="flex w-60 items-center gap-1 p-1 pl-4 hover:shadow-md">
                        <div
                          className="group relative overflow-hidden rounded-full p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEmailSelection(draft.id);
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
                          onClick={(e) => toggleStarred(e, draft.id)}
                        >
                          <Star
                            className={`relative z-10 h-4 w-4 transition-colors duration-200 ${
                              isStarred ? "fill-yellow-500 text-yellow-500" : ""
                            }`}
                          />
                          <span className="absolute inset-0 scale-0 rounded-full bg-gray-200 transition-transform duration-300 ease-out group-hover:scale-150"></span>
                        </button>
                        <span className="text-red-500">Draft</span>
                      </TableCell>
                      <TableCell className="w-full max-w-0 flex-1 overflow-hidden p-1 pr-2">
                        <div className="truncate">
                          <span className="font-semibold text-gray-800">
                            {draft.emailSubject ?? "(no subject)"}
                          </span>
                          <span className="ml-2 font-normal text-gray-500">
                            - {draft.emailContent || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-24 min-w-[6rem] whitespace-nowrap pr-4 text-right text-sm text-gray-500">
                        {draftDate.isSame(moment(), "day")
                          ? draftDate.format("h:mm A")
                          : draftDate.isSame(moment(), "year")
                            ? draftDate.format("MMM D")
                            : draftDate.format("MM/DD/YY")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      {showCompose && (
        <ComposeEmail
          onClose={() => {
            setShowCompose(false);
            setDraftId(null);
          }}
          minimized={minimizeCompose}
          onMinimize={() => setMinimizeCompose(!minimizeCompose)}
          onMaximize={() => setMinimizeCompose(false)}
          existingDraftId={draftId !== null ? draftId : undefined}
        />
      )}
    </>
  );
}
