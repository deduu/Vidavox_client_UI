// src/pages/CheckEmailPage.jsx
import React, { useState } from "react";
import { MailCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { resendVerification } from "../services/api";

export default function CheckEmailPage() {
  const [search] = useSearchParams();
  const email = search.get("email");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");

  const handleResend = async () => {
    setStatus("sending");
    setError("");
    try {
      await resendVerification({ email });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
        <MailCheck className="h-16 w-16 text-blue-500 mx-auto mb-6" />
        <h1 className="text-3xl font-extrabold text-gray-800 mb-4">
          Check Your Inbox!
        </h1>
        <p className="text-gray-600 mb-4 text-lg">
          We’ve sent a verification link to <strong>{email}</strong>.
          <br />
          Please click the link to activate your account.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Didn’t receive it? Check your spam or junk folder.
        </p>

        {status === "done" && (
          <p className="text-green-600 mb-4">A new email has been sent!</p>
        )}
        {status === "error" && (
          <p className="text-red-600 mb-4">Error: {error}</p>
        )}

        <button
          onClick={handleResend}
          disabled={status === "sending"}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {status === "sending" ? "Resending…" : "Resend Email"}
        </button>
      </div>
    </div>
  );
}
