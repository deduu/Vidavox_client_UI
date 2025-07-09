// components/SidebarLayout.jsx
import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { useChatSession } from "../contexts/ChatSessionContext";
import ChatList from "./ChatList";
import { Menu, X } from "lucide-react";

export default function SidebarLayout({ children, bottomSlot }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Nav Toggle */}
      <button
        className="md:hidden p-2 m-2 rounded bg-white shadow"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-white shadow-md flex flex-col transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 transition-transform duration-200`}
      >
        {/* Top Section - Fixed Height */}
        <div className="p-4 flex-shrink-0">
          <h1 className="text-2xl font-bold mb-6">Hello, {user.username}</h1>
          <nav className="space-y-2">
            <NavButton
              icon="📁"
              label="Dashboard"
              active={isActive("/dashboard")}
              onClick={() => navigate("/dashboard")}
            />
            <NavButton
              icon="📚"
              label="Knowledge Bases"
              active={isActive("/knowledge-bases")}
              onClick={() => navigate("/knowledge-bases")}
            />
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-red-600 rounded hover:bg-red-100"
            >
              🚪 Logout
            </button>
          </nav>
        </div>

        {/* Chat Section - Flexible Height */}
        <div className="flex-1 flex flex-col min-h-0 px-4">
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
        <div className="p-4 border-t text-center text-xs text-gray-400 flex-shrink-0">
          {bottomSlot}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden md:pl-72 bg-white">
        {children}
      </main>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full px-3 py-2 rounded ${
        active ? "bg-blue-100 font-semibold" : "hover:bg-blue-50"
      }`}
    >
      <span className="mr-2">{icon}</span> {label}
    </button>
  );
}
