/* eslint-disable react/prop-types */
import React, { useRef } from 'react';
import { ToastRef, ToastContextParams } from './Toast.types';

export const ToastContext = React.createContext<ToastContextParams>({
  toastRef: undefined,
});

export const ToastContextWrapper: React.FC = ({ children }) => {
  const toastRef = useRef<ToastRef | null>(null);
  return (
    <ToastContext.Provider value={{ toastRef }}>
      {children}
    </ToastContext.Provider>
  );
};
