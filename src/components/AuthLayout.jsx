import React from "react";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        {children}
      </div>
    </div>
  );
}
