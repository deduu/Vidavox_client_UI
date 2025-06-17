// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, fetchCurrentUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // NEW: loading = “we’re checking localStorage → backend”
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser()
        .then(u => setUser(u))
        .catch(() => {
          // if token invalid/expired, drop it
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // no token at all
      setLoading(false);
    }
  }, []);

  const login = async creds => {
    const { access_token } = await apiLogin(creds);
    localStorage.setItem('token', access_token);
    const me = await fetchCurrentUser();
    setUser(me);
    navigate('/dashboard');
  };

  const register = async data => {
    await apiRegister(data);
    await login({ username: data.username, password: data.password });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
