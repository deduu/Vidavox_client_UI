// src/components/dashboard/AccountOverview.jsx
import React from "react";
import { User, CreditCard } from "lucide-react";

export const AccountOverview = ({ CreditsDashboard }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 overflow-hidden mb-8">
    <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-8 py-6 border-b border-gray-200/60">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-indigo-100 rounded-xl">
          <CreditCard className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Account Overview</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monitor your account status and usage
          </p>
        </div>
      </div>
    </div>
    <div className="p-8">
      <CreditsDashboard />
    </div>
  </div>
);
