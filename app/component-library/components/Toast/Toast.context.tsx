/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef, useEffect } from 'react';

// Internal dependencies.
import { ToastRef, ToastContextParams } from './Toast.types';
import ToastService from '../../../core/ToastService';

export const ToastContext = React.createContext<ToastContextParams>({
  toastRef: undefined,
});

export const ToastContextWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const toastRef = useRef<ToastRef | null>(null);

  useEffect(() => {
    // Register the ref with ToastService when the component is mounted
    ToastService.toastRef = toastRef;
    // Unregister the ref when the component is unmounted
    return () => {
      ToastService.toastRef = null;
    };
  }, [toastRef]);

  return (
    <ToastContext.Provider value={{ toastRef }}>
      {children}
    </ToastContext.Provider>
  );
};
