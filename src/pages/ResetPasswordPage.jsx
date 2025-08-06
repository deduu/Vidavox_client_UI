// src/pages/ResetPasswordPage.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/api";
import AuthLayout from "../components/AuthLayout";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const [search] = useSearchParams();
  const token = search.get("token") || "";
  const navigate = useNavigate();

  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (pwd !== confirm) return setError("Passwords do not match.");
    if (pwd.length < 8)
      return setError("Password must be at least 8 characters.");

    setStatus("saving");
    try {
      await resetPassword({ token, new_password: pwd });
      navigate("/", { replace: true });
    } catch (err) {
      setStatus("idle");
      setError(err.message);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-center mb-4">
        Set a New Password
      </h1>
      <form onSubmit={onSubmit} className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              className="mt-1 w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-400"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={show ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {show ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            type={show ? "text" : "password"}
            className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={status === "saving"}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {status === "saving" ? "Updating..." : "Update Password"}
        </button>
      </form>
    </AuthLayout>
  );
}
