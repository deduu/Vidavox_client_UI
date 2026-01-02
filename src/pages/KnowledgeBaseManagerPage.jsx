import React from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import KnowledgeBaseManager from "../components/KnowledgeBaseManager";
import SidebarLayout from "../components/SidebarLayout";

export default function KnowledgeBaseManagerPage() {
  const [searchParams] = useSearchParams();
  const preselectedIds = searchParams.get("preselect")?.split(",") || [];
  const navigate = useNavigate();

  const preselectedFileIds = searchParams.get("preselect")
    ? searchParams.get("preselect").split(",")
    : [];

  // Log the value of preselectedIds
  useEffect(() => {
    console.log("Preselected IDs:", preselectedIds);
  }, [preselectedIds]);

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Knowledge Base Manager
          </h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
        <KnowledgeBaseManager preselectedFileIds={preselectedIds} />
      </div>
    </SidebarLayout>
  );
}
