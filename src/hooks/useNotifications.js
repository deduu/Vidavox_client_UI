// src/hooks/useNotifications.js
import { useState } from "react";

export const useNotifications = () => {
  const [notification, setNotification] = useState({
    type: "",
    message: "",
    visible: false,
  });

  const showNotification = (type, message) => {
    setNotification({ type, message, visible: true });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, visible: false })),
      5000
    );
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  return { notification, showNotification, hideNotification };
};
