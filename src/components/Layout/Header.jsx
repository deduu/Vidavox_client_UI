// src/components/Header.jsx
import { useAuth } from "./services/auth";

function Header() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div id="user-info" className="d-flex justify-content-between align-items-center px-3 py-2 bg-dark text-light">
      <div>
        Welcome, <strong id="username_display">{user.username}</strong> - Credits:{" "}
        <span id="credits_display">{user.credits}</span>
      </div>
      <button id="btn-logout" onClick={logout} className="btn btn-outline-light btn-sm">
        Logout
      </button>
    </div>
  );
}

export default Header;
