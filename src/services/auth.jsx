import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api_b";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      if (api.token) {
        try {
          const currentUser = await api.getCurrentUser();
          setUser(currentUser);
        } catch (e) {
          console.warn("Auto-login failed:", e.message);
          api.logout();
        }
      }
      setInitializing(false);
    };
    initialize();
  }, []);

    /* --------  Global 401 → force logout  -------- */
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("unauthorized", handler);
    return () => window.removeEventListener("unauthorized", handler);
  }, []);

  const login = async (username, password) => {
    await api.login(username, password);
    const currentUser = await api.getCurrentUser();
    setUser(currentUser);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
