import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const [verifiedMsg, setVerifiedMsg] = useState(null);

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "success") {
      setVerifiedMsg({
        type: "success",
        text: "✅ Your email has been successfully verified. You can now log in.",
      });
    } else if (verified === "failed") {
      setVerifiedMsg({
        type: "error",
        text: "❌ Email verification failed or link expired.",
      });
    }
  }, [searchParams]);

  return (
    <AuthLayout>
      {/* Logo */}
      <div className="flex justify-center mb-6">
        <img
          src="/vidavox_white.png"
          alt="Company Logo"
          className="max-h-25 w-auto"
        />
      </div>
      <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>

      {verifiedMsg && (
        <div
          className={`mb-4 px-4 py-3 rounded text-sm border ${
            verifiedMsg.type === "success"
              ? "bg-green-100 text-green-800 border-green-300"
              : "bg-red-100 text-red-800 border-red-300"
          }`}
        >
          {verifiedMsg.text}
        </div>
      )}

      <LoginForm />
      {/* ✅ Add Forgot Password link here */}
      <div className="text-right text-sm mt-2">
        <Link to="/forgot-password" className="text-blue-600 hover:underline">
          Forgot Password?
        </Link>
      </div>
      <p className="text-center text-sm text-gray-600 mt-4">
        Don’t have an account?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register now
        </Link>
      </p>
    </AuthLayout>
  );
}
