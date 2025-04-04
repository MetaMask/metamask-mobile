/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef } from 'react';

// Internal dependencies.
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
