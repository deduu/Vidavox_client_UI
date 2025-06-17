// src/components/CreditsDashboard.jsx
import React, { useEffect, useState, useContext } from 'react';
import { fetchUsage } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';

const PERIODS = ['daily', 'monthly', 'yearly'];

function getFriendlyAction(raw) {
  if (raw.startsWith('POST') && raw.includes('upload')) return 'Upload File';
  if (raw.startsWith('DELETE') && raw.includes('/folder/file/')) return 'Delete File';
  if (raw.startsWith('DELETE') && raw.includes('/folder/')) return 'Delete Folder';
  if (raw.startsWith('GET') && raw.includes('/users/me')) return 'View Profile';
  return raw;
}

export default function CreditsDashboard() {
  const { user } = useContext(AuthContext);
  const [usage, setUsage]       = useState(null);
  const [period, setPeriod]     = useState('monthly');
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!user) return;           // wait for user to load
    setLoading(true);
    setError(null);

    fetchUsage(period)
      .then(data => {
        setUsage(data);
      })
      .catch(err => {
        if (err.status === 404) {
          // no records yet → zero it out
          setUsage({
            user_id:           user.id,
            period,
            total_calls:       0,
            total_credits_used:0,
            remaining_credits: user.credits,
            most_used_endpoint:'-',
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
      <div className="flex items-center justify-center h-32">
        <svg
          className="animate-spin h-8 w-8 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none" viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded">
        Error loading usage: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Period selector */}
      <div className="flex space-x-2 mb-6">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`
              px-4 py-1 rounded-lg border
              ${period === p
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'}
            `}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Remaining Credits</h3>
          <p className="mt-2 text-3xl font-semibold">
            {usage.remaining_credits}
          </p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Calls</h3>
          <p className="mt-2 text-3xl font-semibold">
            {usage.total_calls}
          </p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Credits Used</h3>
          <p className="mt-2 text-3xl font-semibold">
            {usage.total_credits_used}
          </p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Top Action</h3>
          <p className="mt-2 text-xl">
            {getFriendlyAction(usage.most_used_endpoint)}
          </p>
        </div>
      </div>
    </div>
  );
}
