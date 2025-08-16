'use client';
import React, { createContext, JSX, useContext } from "react";
import { toast, ToastOptions, Toast } from "react-hot-toast";

interface NotificationContextType {
  notify: (message: string, options?: ToastOptions) => void;
  custom: (content: (t: Toast) => JSX.Element, options?: ToastOptions) => void;
  dismiss: (id?: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
  custom: () => {},
  dismiss: () => {},
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const notify = (message: string, options?: ToastOptions) => {
    toast(message, options);
  };

  const custom = (content: (t: Toast) => JSX.Element, options?: ToastOptions) => {
    toast.custom(content, options);
  };

  const dismiss = (id?: string) => {
    toast.dismiss(id);
  };

  return (
    <NotificationContext.Provider value={{ notify, custom, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
