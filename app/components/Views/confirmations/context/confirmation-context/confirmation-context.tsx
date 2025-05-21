import React, { useContext, useMemo, useState } from 'react';

export interface ConfirmationContextParams {
  isTransactionValueUpdating: boolean;
  setIsTransactionValueUpdating: (isTransactionValueUpdating: boolean) => void;
}

// This context is used to share the valuable information between the components
// that are used to render the confirmation
const ConfirmationContext = React.createContext<ConfirmationContextParams>({
  isTransactionValueUpdating: false,
  // eslint-disable-next-line no-empty-function
  setIsTransactionValueUpdating: () => {},
});

interface ConfirmationContextProviderProps {
  children: React.ReactNode;
}

export const ConfirmationContextProvider: React.FC<
  ConfirmationContextProviderProps
> = ({ children }) => {
  const [isTransactionValueUpdating, setIsTransactionValueUpdating] =
    useState(false);

  const contextValue = useMemo(
    () => ({
      isTransactionValueUpdating,
      setIsTransactionValueUpdating,
    }),
    [isTransactionValueUpdating, setIsTransactionValueUpdating],
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
