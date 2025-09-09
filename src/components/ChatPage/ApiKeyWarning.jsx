// components/ApiKeyWarning.jsx
import React from "react";

export default function ApiKeyWarning({ missingApiKey, setMissingApiKey }) {
  if (!missingApiKey) return null;

  return (
    <div
      className="animate-fade-in border-l-4 border-yellow-500 bg-yellow-100 text-yellow-700 p-4 mb-4 rounded shadow pulse-slow"
      ref={(el) => el?.scrollIntoView({ behavior: "smooth", block: "center" })}
    >
      <p className="font-bold text-lg">🚨 Missing API Key</p>
      <p className="text-sm">{missingApiKey}</p>
      <p className="mt-2 text-sm">
        Please{" "}
        <a href="/profile" className="underline text-blue-600 font-semibold">
          go to your profile
        </a>{" "}
        and add the API key to continue using this model.
      </p>
      <button
        className="mt-3 text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition"
        onClick={() => setMissingApiKey(null)}
      >
        Dismiss
      </button>
    </div>
  );
}
