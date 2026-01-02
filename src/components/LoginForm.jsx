import React, { useState, useContext } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";

export default function LoginForm({ onErrorMessage }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (onErrorMessage) onErrorMessage(null);

    try {
      await login({ username, password });
    } catch (err) {
      const msg = err?.message || "Login failed";
      if (msg.toLowerCase().includes("not verified")) {
        if (onErrorMessage) {
          onErrorMessage({
            type: "warning",
            title: "Email Not Verified",
            text: "Please verify your email address before logging in.",
            icon: "📩",
            dismissible: true,
          });
        } else {
          setError("Please verify your email before logging in.");
        }
      } else {
        setError("Incorrect username or password.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
          placeholder="Your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className="mt-1 w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-400"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Sign In
      </button>
    </form>
  );
}
