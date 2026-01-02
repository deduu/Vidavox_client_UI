// components/SidebarLayout.jsx
import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { useChatSession } from "../contexts/ChatSessionContext";
import ChatList from "./ChatList";
import {
  Menu,
  X,
  LayoutDashboard,
  Database,
  FilePlus,
  LogOut,
  User,
  ChevronDown,
  Settings,
} from "lucide-react";

// SidebarLayout.jsx (top-level of the component file)
const UNIDOCPARSER_ENABLED = false;

export default function SidebarLayout({ children, bottomSlot, fit = false }) {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const {
    chats,
    currentChatId,
    createNewChat,
    setCurrentChatId,
    deleteChat,
    renameChat,
  } = useChatSession();
  const navigate = useNavigate();
  const loc = useLocation();
  const isActive = (path) => loc.pathname.startsWith(path);

  // Get user initials for avatar
  const getUserInitials = (username) => {
    if (!username) return "U";
    return username
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
  };

  return (
    <div className="flex min-h-[100dvh] bg-gray-50 overflow-hidden">
      {/* Mobile Nav Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-200 flex flex-col transform z-50 ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-200 ease-in-out`}
      >
        {/* Header with User Info */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          {/* Logo/Brand Area */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900">Agentic AI</h1>
            <p className="text-sm text-gray-500">Intelligent Assistant</p>
          </div>

          {/* User Profile Section */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center w-full p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* User Avatar */}
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm mr-3 flex-shrink-0">
                {getUserInitials(user.username)}
              </div>

              {/* User Info */}
              <div className="flex-1 text-left">
                <div className="font-medium text-gray-900 truncate">
                  {user.username}
                </div>
                <div className="text-sm text-gray-500">
                  {user.email || "Active"}
                </div>
              </div>

              {/* Dropdown Arrow */}
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  userMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* User Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User size={16} className="mr-3" />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/settings");
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings size={16} className="mr-3" />
                    Preferences
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} className="mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="px-4 py-4 flex-shrink-0">
          <nav className="space-y-1">
            {/* <NavButton
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              active={isActive("/dashboard")}
              onClick={() => {
                navigate("/dashboard");
                setOpen(false);
              }}
            /> */}
            {/* Universal Document Parser tab */}
            {/* <NavButton
              icon={<FilePlus size={18} />}
              label="UniDocParser"
              active={isActive("/unidocparser")}
              // disabled={!UNIDOCPARSER_ENABLED}
              soonLabel="Launching very soon"
              onClick={() => {
                // Only runs when enabled (NavButton will guard this)
                navigate("/unidocparser");
                setOpen(false);
              }}
            /> */}

            {/* <NavButton
              icon={<Database size={18} />}
              label="Knowledge Bases"
              active={isActive("/knowledge-bases")}
              onClick={() => {
                navigate("/knowledge-bases");
                setOpen(false);
              }}
            /> */}
          </nav>
        </div>

        {/* Chat Section - Flexible Height */}
        <div className="flex-1 flex flex-col min-h-0 px-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Recent Chats</h3>
            <div className="text-xs text-gray-500">
              {chats.length} {chats.length === 1 ? "chat" : "chats"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <ChatList
              chats={chats}
              currentId={currentChatId}
              onSelect={(id) => {
                setCurrentChatId(id);
                navigate("/chat");
                setOpen(false);
              }}
              onDelete={deleteChat}
              onRename={renameChat}
              onCreate={() => {
                createNewChat();
                setOpen(false);
                navigate("/chat");
              }}
            />
          </div>
        </div>

        {/* Bottom Section - Fixed Height */}
        <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-500 flex-shrink-0">
          {bottomSlot}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="
          flex-1 flex flex-col
          overflow-y-auto overflow-x-hidden
          md:pl-72
          h-screen
          min-h-0     /* or min-h-screen */
          bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
        "
        // className="flex flex-col h-screen min-h-0"
      >
        {children}
      </main>

      {/* <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden md:pl-72 ">
        {children}
      </main> */}
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
  disabled = false,
  soonLabel,
}) {
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      // Optional: show a toast/modal instead of doing nothing
      // e.g., toast.info(soonLabel || "Coming soon");
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? soonLabel || "Coming soon" : undefined}
      className={[
        "flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-gray-50 hover:text-gray-900",
        active
          ? "bg-blue-50 text-blue-700 border border-blue-200"
          : "text-gray-700",
      ].join(" ")}
    >
      <span className={`mr-3 ${active ? "text-blue-600" : "text-gray-400"}`}>
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {disabled && (
        <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border bg-amber-100 border-amber-200 text-amber-700">
          Soon
        </span>
      )}
    </button>
  );
}
