// src/components/dashboard/StatsCards.jsx
import React from "react";
import { FilePlus, Folder, HardDrive, TrendingUp } from "lucide-react";

export const StatsCards = ({ stats, formatBytes }) => {
  const cards = [
    {
      title: "Total Files",
      value: stats.totalFiles,
      icon: FilePlus,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "Folders",
      value: stats.totalFolders,
      icon: Folder,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      title: "Storage Used",
      value: formatBytes(stats.totalSize),
      icon: HardDrive,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => (
        <div
          key={card.title}
          className="group bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/60 shadow-md hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">{card.title}</p>
              <p className="text-xl font-semibold text-gray-900 group-hover:text-gray-800">
                {card.value}
              </p>
            </div>
            <div
              className={`p-2 ${card.bgColor} rounded-xl group-hover:scale-105 transition-transform duration-200`}
            >
              <card.icon className={`w-5 h-5 ${card.textColor}`} />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>Active</span>
          </div>
        </div>
      ))}
    </div>
  );
};
