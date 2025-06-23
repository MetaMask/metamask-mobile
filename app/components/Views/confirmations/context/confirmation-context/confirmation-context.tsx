import { noop } from 'lodash';
import React, { useContext, useMemo, useState } from 'react';

export interface ConfirmationContextParams {
  isConfirmationDismounting: boolean;
  isTransactionValueUpdating: boolean;
  setIsConfirmationDismounting: (isConfirmationDismounting: boolean) => void;
  setIsTransactionValueUpdating: (isTransactionValueUpdating: boolean) => void;
}

// This context is used to share the valuable information between the components
// that are used to render the confirmation
const ConfirmationContext = React.createContext<ConfirmationContextParams>({
  isConfirmationDismounting: false,
  isTransactionValueUpdating: false,
  setIsConfirmationDismounting: noop,
  setIsTransactionValueUpdating: noop,
});

interface ConfirmationContextProviderProps {
  children: React.ReactNode;
}

export const ConfirmationContextProvider: React.FC<
  ConfirmationContextProviderProps
> = ({ children }) => {
  const [isTransactionValueUpdating, setIsTransactionValueUpdating] =
    useState(false);
  const [isConfirmationDismounting, setIsConfirmationDismounting] =
    useState(false);

  const contextValue = useMemo(
    () => ({
      isTransactionValueUpdating,
      setIsTransactionValueUpdating,
      isConfirmationDismounting,
      setIsConfirmationDismounting,
    }),
    [
      isConfirmationDismounting,
      isTransactionValueUpdating,
      setIsConfirmationDismounting,
      setIsTransactionValueUpdating,
    ],
  );

  return (
    <ConfirmationContext.Provider value={contextValue}>
      {children}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmationContext = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      'useConfirmationContext must be used within a ConfirmationContextProvider',
    );
  }
  return context;
};
