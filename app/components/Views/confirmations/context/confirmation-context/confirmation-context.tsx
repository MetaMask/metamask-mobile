import { noop } from 'lodash';
import React, { useContext, useMemo, useState } from 'react';

export interface ConfirmationContextParams {
  headlessBuyError: string | undefined;
  isFooterVisible?: boolean;
  isHeadlessBuyInProgress: boolean;
  isTransactionValueUpdating: boolean;
  isTransactionDataUpdating: boolean;
  setHeadlessBuyError: (error: string | undefined) => void;
  setIsFooterVisible: (isFooterVisible: boolean) => void;
  setIsHeadlessBuyInProgress: (isHeadlessBuyInProgress: boolean) => void;
  setIsTransactionValueUpdating: (isTransactionValueUpdating: boolean) => void;
  setIsTransactionDataUpdating: (isTransactionDataUpdating: boolean) => void;
}

// This context is used to share the valuable information between the components
// that are used to render the confirmation
const ConfirmationContext = React.createContext<ConfirmationContextParams>({
  headlessBuyError: undefined,
  isFooterVisible: true,
  isHeadlessBuyInProgress: false,
  isTransactionDataUpdating: false,
  isTransactionValueUpdating: false,
  setHeadlessBuyError: noop,
  setIsFooterVisible: noop,
  setIsHeadlessBuyInProgress: noop,
  setIsTransactionDataUpdating: noop,
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

  const [isFooterVisible, setIsFooterVisible] = useState<boolean>();

  const [headlessBuyError, setHeadlessBuyError] = useState<
    string | undefined
  >();

  const [isHeadlessBuyInProgress, setIsHeadlessBuyInProgress] = useState(false);

  const [isTransactionDataUpdating, setIsTransactionDataUpdating] =
    useState<boolean>(false);

  const contextValue = useMemo(
    () => ({
      headlessBuyError,
      isFooterVisible,
      isHeadlessBuyInProgress,
      isTransactionDataUpdating,
      isTransactionValueUpdating,
      setHeadlessBuyError,
      setIsFooterVisible,
      setIsHeadlessBuyInProgress,
      setIsTransactionDataUpdating,
      setIsTransactionValueUpdating,
    }),
    [
      headlessBuyError,
      isFooterVisible,
      isHeadlessBuyInProgress,
      isTransactionDataUpdating,
      isTransactionValueUpdating,
      setHeadlessBuyError,
      setIsFooterVisible,
      setIsHeadlessBuyInProgress,
      setIsTransactionDataUpdating,
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
