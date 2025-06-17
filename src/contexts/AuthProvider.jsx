import React, { useState, useEffect } from 'react';
import AuthContext from './AuthContext';
import { login as apiLogin, register as apiRegister, fetchCurrentUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
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
