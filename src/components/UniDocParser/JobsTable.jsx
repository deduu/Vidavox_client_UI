// src/components/UniDocParser/JobsTable.jsx
import React from "react";

// Utility function to extract filename from UUID prefixed filename
function extractFilename(fullFilename) {
  if (!fullFilename) return "";

  // Pattern to match UUID prefix: 8-4-4-4-12 hex characters followed by underscore
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

  // Remove UUID prefix if it exists
  return fullFilename.replace(uuidPattern, "");
}

export default function JobsTable({ jobs, onSelectJob }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-gray-500">
        <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900 mb-1">No jobs yet</p>
        <p className="text-xs text-center">
          Upload and process your first document to see job history here.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="overflow-y-auto max-h-full">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job, idx) => (
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="cursor-pointer hover:bg-blue-50 transition-colors duration-150"
                >
                  <td className="px-3 py-3 text-gray-500 font-medium">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span
                        className="text-gray-900 font-medium truncate max-w-xs"
                        title={extractFilename(job.source_file_name)}
                      >
                        {extractFilename(job.source_file_name)}
                      </span>
                      {job.error_message && (
                        <span
                          className="text-xs text-red-500 truncate max-w-xs mt-1"
                          title={job.error_message}
                        >
                          {job.error_message}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">
                    {new Date(job.created_at).toLocaleDateString()}
                    <br />
                    <span className="text-gray-400">
                      {new Date(job.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 p-3">
        {jobs.map((job, idx) => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all duration-150"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-gray-900 truncate"
                  title={extractFilename(job.source_file_name)}
                >
                  {extractFilename(job.source_file_name)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Job #{idx + 1} •{" "}
                  {new Date(job.created_at).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </div>
            {job.error_message && (
              <p
                className="text-xs text-red-500 mt-2 truncate"
                title={job.error_message}
              >
                {job.error_message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "succeeded":
      case "completed":
      case "success":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          icon: (
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case "failed":
      case "error":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          icon: (
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case "processing":
      case "running":
      case "pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          icon: (
            <svg
              className="w-3 h-3 mr-1 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ),
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          icon: (
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      {status || "Unknown"}
    </span>
  );
}
