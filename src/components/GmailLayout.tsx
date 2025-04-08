import React, { ReactNode, useState, createContext, useContext } from "react";
import {
  Menu,
  Search,
  Settings,
  HelpCircle,
  Mail,
  Star,
  Clock,
  Send,
  FileText,
  MoreHorizontal,
  Plus,
  PencilIcon,
  Trash2,
} from "lucide-react";

import ComposeEmail from "./ComposeEmail";
import Image from "next/image";
import { api } from "~/utils/api";
import { useRouter } from "next/router";
import { useDebounce } from "use-debounce";
import { useSession, signOut } from "next-auth/react";
interface GmailLayoutProps {
  children: ReactNode;
}

const SearchContext = createContext({
  query: "",
  setQuery: (q: string) => {},
});

export default function GmailLayout({ children }: GmailLayoutProps) {
  const { data: session } = useSession();
  
  const [showCompose, setShowCompose] = useState(false);
  const [minimizeCompose, setMinimizeCompose] = useState(false);
  const createDraftMutation = api.email.createDraft.useMutation();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const user = session?.user;  
  const router = useRouter();
  const handleComposeClick = async () => {
    if (minimizeCompose) {
      setMinimizeCompose(false);
    } else {
      const draft = await createDraftMutation.mutateAsync({
        subject: "",
        content: "",
      });
      setDraftId(draft.id);
      setShowCompose(true);
    }
  };
  const routerQuery = router.pathname.split("/")[1];
  const [selectedTab, setSelectedTab] = useState(routerQuery && routerQuery?.length > 0 ? routerQuery : "inbox");
  const { data: emailInboxCount } = api.email.getUserEmailsCount.useQuery();
  const { data: emailDraftsCount } = api.email.getEmailDraftsCount.useQuery();
  const { data: emailStarredCount } =
    api.email.getStarredEmailsCount.useQuery({
      search: debouncedSearch,
    });
  const handleCloseCompose = () => {
    setShowCompose(false);
    setMinimizeCompose(false);
  };

  const handleMinimizeCompose = () => {
    setMinimizeCompose(true);
  };

  const handleMaximizeCompose = () => {
    setMinimizeCompose(false);
  };
  return (
    <div className="flex h-screen flex-col bg-[#f8fafd]">
      {/* Header */}
      <header className="flex h-16 items-center px-4">
        <div className="flex items-center gap-4">
          {/* <SignOutButton> */}
            <button className="rounded-full p-2 hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
          {/* </SignOutButton> */}
          <div className="flex items-center gap-2">
            <Image
              src={
                "https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_lockup_default_1x_r5.png"
              }
              alt="Gmail Logo"
              width={110}
              height={110}
            />
          </div>
        </div>

        <div className="ml-20 flex flex-1 items-center">
          <div className="flex h-12 w-full max-w-2xl items-center rounded-full bg-[#e9eef6] px-4">
            <Search className="h-5 w-5 text-gray-600" />
            <input
              type="text"
              placeholder="Search mail"
              className="ml-2 flex-1 bg-transparent outline-none placeholder:text-gray-600"
              onChange={(e) => setSearch(e.target.value)}
              value={search}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-full p-2 hover:bg-gray-100">
            <HelpCircle className="h-5 w-5 text-gray-600" />
          </button>
          <button className="rounded-full p-2 hover:bg-gray-100">
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
            <button className="ml-2 h-8 w-8 overflow-hidden rounded-full bg-gray-300"
            onClick={() => signOut()}>
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || "User"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-blue-500 text-white">
                {user?.fullName?.[0] || "U"}
                </div>
              )}
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-64 flex-col py-4 pr-4">
          <button
            className="mb-4 ml-2 mr-14 flex w-fit items-center gap-4 rounded-2xl bg-[#c2e7ff] px-4 py-[17px] text-sm font-medium shadow-sm hover:shadow-md"
            onClick={handleComposeClick}
          >
            <PencilIcon className="h-5 w-5" />
            <span>Compose</span>
          </button>

          <nav className="">
            {[
              {
                icon: <Mail className="h-4 w-4" />,
                label: "inbox",
                count: emailInboxCount,
                href: "/",
              },
              {
                icon: <Star className="h-4 w-4" />,
                label: "starred",
                href: "/starred",
                count: emailStarredCount,
              },
              {
                icon: <Clock className="h-4 w-4" />,
                label: "snoozed",
                href: "#x",
              },
              { icon: <Send className="h-4 w-4" />, label: "sent", href: "/sent" },
              {
                icon: <FileText className="h-4 w-4" />,
                label: "drafts",
                count: emailDraftsCount,
                href: "/drafts",
              },
              {
                icon: <Trash2 className="h-4 w-4" />,
                label: "trash",
                href: "/trash",
                count: 0,
              },
            ].map((item, index) => (
              <div
                key={index}
                className={`flex cursor-pointer items-center justify-between rounded-r-full px-3 py-2 text-sm ${
                  selectedTab === item.label.toLowerCase()
                    ? "bg-blue-100 font-semibold text-gray-700"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => {
                  setSelectedTab(item.label);
                  if (item.href) {
                    router.push(item.href);
                  }
                }}
              >
                <div className="flex items-center gap-3 pl-3">
                  {item.icon}
                  <span className="capitalize">{item.label}</span>
                </div>
                <span className="text-xs">{item.count}</span>
              </div>
            ))}
          </nav>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-gray-100">
              <div className="flex items-center gap-3">
                <MoreHorizontal className="h-5 w-5" />
                <span>More</span>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <h2 className="px-3 text-sm font-medium text-gray-600">Labels</h2>
          </div>
        </aside>

        {/* Main content */}
        <main className="w-full flex-1">
          <SearchContext.Provider
            value={{ query: debouncedSearch, setQuery: setSearch }}
          >
            {children}
          </SearchContext.Provider>
        </main>
      </div>

      {/* Compose Email */}
      {showCompose && (
        <ComposeEmail
          onClose={handleCloseCompose}
          minimized={minimizeCompose}
          onMinimize={handleMinimizeCompose}
          onMaximize={handleMaximizeCompose}
          existingDraftId={draftId || undefined}
        />
      )}
    </div>
  );
}

export const useSearch = () => useContext(SearchContext);
