import { noop } from 'lodash';
import React, { useContext, useMemo, useState } from 'react';

export interface ConfirmationContextParams {
  isFooterVisible?: boolean;
  isTransactionValueUpdating: boolean;
  setIsFooterVisible: (isFooterVisible: boolean) => void;
  setIsTransactionValueUpdating: (isTransactionValueUpdating: boolean) => void;
}

// This context is used to share the valuable information between the components
// that are used to render the confirmation
const ConfirmationContext = React.createContext<ConfirmationContextParams>({
  isFooterVisible: true,
  isTransactionValueUpdating: false,
  setIsFooterVisible: noop,
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

  const [isFooterVisible, setIsFooterVisible] = useState(true);

  const contextValue = useMemo(
    () => ({
      isFooterVisible,
      isTransactionValueUpdating,
      setIsFooterVisible,
      setIsTransactionValueUpdating,
    }),
    [
      isFooterVisible,
      isTransactionValueUpdating,
      setIsFooterVisible,
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
