import React, { useEffect, useState, useContext } from "react";
import { fetchUsage } from "../services/api";
import { AuthContext } from "../contexts/AuthContext";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const PERIODS = ["daily", "monthly", "yearly"];

function getFriendlyAction(raw) {
  if (raw.startsWith("POST") && raw.includes("upload")) return "Upload File";
  if (raw.startsWith("DELETE") && raw.includes("/folder/file/"))
    return "Delete File";
  if (raw.startsWith("DELETE") && raw.includes("/folder/"))
    return "Delete Folder";
  if (raw.startsWith("GET") && raw.includes("/users/me")) return "View Profile";
  return raw;
}

export default function CreditsDashboard() {
  const { user } = useContext(AuthContext);
  const [usage, setUsage] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return; // wait for user to load
    setLoading(true);
    setError(null);

    fetchUsage(period)
      .then((data) => {
        setUsage(data);
      })
      .catch((err) => {
        if (err.status === 404) {
          // no records yet → zero it out
          setUsage({
            user_id: user.id,
            period,
            total_calls: 0,
            total_credits_used: 0,
            remaining_credits: user.credits,
            most_used_endpoint: "-",
          });
        } else {
          setError(err.message);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, period]);

  if (isLoading || !usage) {
    return (
      <div className="flex items-center justify-center h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-blue-600 font-medium">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-red-800 font-semibold">
              Error Loading Usage Data
            </h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Chart Data with enhanced styling
  const chartData = {
    labels: ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
    datasets: [
      {
        label: "Credits Used",
        data: [
          usage.total_credits_used,
          usage.total_credits_used * 1.2,
          usage.total_credits_used * 1.5,
          50,
          70,
          80,
          90,
        ],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "white",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: "500",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "white",
        bodyColor: "white",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
    },
  };

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Usage Analytics
            </h2>
            <p className="text-gray-600">
              Monitor your credit consumption and API usage
            </p>
          </div>

          {/* Period selector with enhanced styling */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 transform
                  ${
                    period === p
                      ? "bg-white text-blue-600 shadow-md scale-105"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }
                `}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Remaining Credits */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
                Remaining Credits
              </h3>
              <div className="w-8 h-8 bg-emerald-200 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-900 mb-1">
              {usage.remaining_credits.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-700">Available for use</p>
          </div>
        </div>

        {/* Total Calls */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wide">
                Total Calls
              </h3>
              <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-1">
              {usage.total_calls.toLocaleString()}
            </p>
            <p className="text-xs text-blue-700">API requests made</p>
          </div>
        </div>

        {/* Total Credits Used */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-purple-800 uppercase tracking-wide">
                Credits Used
              </h3>
              <div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-900 mb-1">
              {usage.total_credits_used.toLocaleString()}
            </p>
            <p className="text-xs text-purple-700">Total consumption</p>
          </div>
        </div>

        {/* Top Action */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">
                Top Action
              </h3>
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-amber-900 mb-1 truncate">
              {getFriendlyAction(usage.most_used_endpoint)}
            </p>
            <p className="text-xs text-amber-700">Most frequent operation</p>
          </div>
        </div>
      </div>

      {/* Enhanced Line Chart */}
      {/* <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-gray-900">
              Credits Usage Trend
            </h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Track your credit consumption over the selected period
          </p>
        </div>
        <div className="p-6">
          <div style={{ height: "300px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      </div> */}
    </div>
  );
}
