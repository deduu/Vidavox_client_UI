// src/pages/VerifyEmailPage.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../services/api";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState("loading"); // 'loading' | 'success' | 'error'
  const [search] = useSearchParams();
  const token = search.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    async function runVerification() {
      try {
        await verifyEmail(token);
        setStatus("success");
      } catch (err) {
        console.error("Verification error:", err);
        setStatus("error");
      }
    }

    runVerification();
  }, [token]);

  let body;
  if (status === "loading") {
    body = <p>Verifying…</p>;
  } else if (status === "success") {
    body = (
      <>
        <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
        <Link to="/" className="text-blue-600 hover:underline">
          Click here to log in
        </Link>
      </>
    );
  } else {
    body = <p className="text-red-600">Invalid or expired link.</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow text-center max-w-sm">
        {body}
      </div>
    </div>
  );
}
