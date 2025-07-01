import { useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function SidebarLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md p-4">
        <h1 className="text-xl font-bold mb-4">Hello, {user.username}</h1>
        <nav className="space-y-2">
          <button
            onClick={() => navigate("/dashboard")}
            className={`block w-full text-left px-3 py-2 rounded ${
              isActive("/dashboard")
                ? "bg-blue-200 font-semibold"
                : "hover:bg-blue-100"
            }`}
          >
            📁 Dashboard
          </button>
          <button
            onClick={() => navigate("/knowledge-bases")}
            className={`block w-full text-left px-3 py-2 rounded ${
              isActive("/knowledge-bases")
                ? "bg-blue-200 font-semibold"
                : "hover:bg-blue-100"
            }`}
          >
            📚 Knowledge Bases
          </button>
          <button
            onClick={() => navigate("/chat")}
            className={`block w-full text-left px-3 py-2 rounded ${
              isActive("/chat")
                ? "bg-blue-200 font-semibold"
                : "hover:bg-blue-100"
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={logout}
            className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-100"
          >
            🚪 Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
