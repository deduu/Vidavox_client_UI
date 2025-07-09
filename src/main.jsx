import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatSessionProvider } from "./contexts/ChatSessionContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <ChatSessionProvider>
        <App />
      </ChatSessionProvider>
    </AuthProvider>
  </BrowserRouter>
);
