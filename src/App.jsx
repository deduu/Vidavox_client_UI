// App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CheckEmailPage from "./pages/CheckEmailPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import KnowledgeBaseManagerPage from "./pages/KnowledgeBaseManagerPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import { ChatSessionProvider } from "./contexts/ChatSessionContext";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import UniDocParserPage from "./pages/UniDocParserPage";

function PrivateRoute({ children }) {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return null; // or a spinner

  return user ? (
    <ChatSessionProvider>{children}</ChatSessionProvider>
  ) : (
    <Navigate to="/" replace />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/unidocparser"
        element={
          <PrivateRoute>
            <UniDocParserPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/knowledge-bases"
        element={
          <PrivateRoute>
            <KnowledgeBaseManagerPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfileSettingsPage />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
