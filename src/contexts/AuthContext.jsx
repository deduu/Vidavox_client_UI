// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  fetchCurrentUser,
} from "../services/api";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // Add token to state
  // NEW: loading = "we're checking localStorage → backend"
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken); // Set token in state
      fetchCurrentUser()
        .then((u) => setUser(u))
        .catch(() => {
          // if token invalid/expired, drop it
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // no token at all
      setLoading(false);
    }
  }, []);

  const login = async (creds) => {
    const { access_token } = await apiLogin(creds);
    localStorage.setItem("token", access_token);
    setToken(access_token); // Update state
    const me = await fetchCurrentUser();
    setUser(me);
    navigate("/chat");
  };

  const register = async (data) => {
    await apiRegister(data);
    navigate(`/check-email?email=${encodeURIComponent(data.email)}`);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null); // Clear token from state
    setUser(null);
    navigate("/");
  };

  // Get auth headers using the token from state
  const getAuthHeaders = useCallback(
    (includeContentType = true) => {
      const token = localStorage.getItem("token");
      if (!token) return {};

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      if (includeContentType) {
        headers["Content-Type"] = "application/json";
      }

      return headers;
    },
    [token]
  );

  const contextValue = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getAuthHeaders,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
