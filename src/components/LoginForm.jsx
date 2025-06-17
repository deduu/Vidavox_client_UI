import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);

  const handleSubmit = e => {
    e.preventDefault();
    login({ username, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Username</label>
        <input
          className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
          placeholder="Your username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          className="mt-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Sign In
      </button>
    </form>
  );
}
