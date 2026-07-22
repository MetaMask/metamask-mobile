import { noop } from 'lodash';
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface ConfirmationContextParams {
  mmPayRequestInProgressNavHandler: React.MutableRefObject<
    (() => void) | false
  >;
  headlessBuyError: string | undefined;
  isFooterVisible?: boolean;
  isConfirmationSubmitting: boolean;
  isConfirmationSubmittingRef: React.RefObject<boolean>;
  isHeadlessBuyInProgress: boolean;
  isTransactionValueUpdating: boolean;
  isTransactionDataUpdating: boolean;
  setHeadlessBuyError: (error: string | undefined) => void;
  setIsConfirmationSubmitting: (isConfirmationSubmitting: boolean) => void;
  setIsFooterVisible: (isFooterVisible: boolean) => void;
  setIsHeadlessBuyInProgress: (isHeadlessBuyInProgress: boolean) => void;
  setIsTransactionValueUpdating: (isTransactionValueUpdating: boolean) => void;
  setIsTransactionDataUpdating: (isTransactionDataUpdating: boolean) => void;
}

// This context is used to share the valuable information between the components
// that are used to render the confirmation
const ConfirmationContext = React.createContext<ConfirmationContextParams>({
  mmPayRequestInProgressNavHandler: { current: false },
  headlessBuyError: undefined,
  isFooterVisible: true,
  isConfirmationSubmitting: false,
  isConfirmationSubmittingRef: { current: false },
  isHeadlessBuyInProgress: false,
  isTransactionDataUpdating: false,
  isTransactionValueUpdating: false,
  setHeadlessBuyError: noop,
  setIsConfirmationSubmitting: noop,
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
  const mmPayRequestInProgressNavHandler = useRef<(() => void) | false>(false);

  const [isTransactionValueUpdating, setIsTransactionValueUpdating] =
    useState(false);

  const [isFooterVisible, setIsFooterVisible] = useState<boolean>();

  const [headlessBuyError, setHeadlessBuyError] = useState<
    string | undefined
  >();

  const [isHeadlessBuyInProgress, setIsHeadlessBuyInProgress] = useState(false);

  const [isTransactionDataUpdating, setIsTransactionDataUpdating] =
    useState<boolean>(false);

  const isConfirmationSubmittingRef = useRef(false);
  const [isConfirmationSubmitting, setIsConfirmationSubmittingState] =
    useState<boolean>(false);
  const setIsConfirmationSubmitting = useCallback(
    (nextIsConfirmationSubmitting: boolean) => {
      isConfirmationSubmittingRef.current = nextIsConfirmationSubmitting;
      setIsConfirmationSubmittingState(nextIsConfirmationSubmitting);
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      mmPayRequestInProgressNavHandler,
      headlessBuyError,
      isFooterVisible,
      isHeadlessBuyInProgress,
      isTransactionDataUpdating,
      isTransactionValueUpdating,
      isConfirmationSubmitting,
      isConfirmationSubmittingRef,
      setHeadlessBuyError,
      setIsFooterVisible,
      setIsHeadlessBuyInProgress,
      setIsTransactionDataUpdating,
      setIsTransactionValueUpdating,
      setIsConfirmationSubmitting,
    }),
    [
      mmPayRequestInProgressNavHandler,
      headlessBuyError,
      isFooterVisible,
      isHeadlessBuyInProgress,
      isTransactionDataUpdating,
      isTransactionValueUpdating,
      isConfirmationSubmitting,
      isConfirmationSubmittingRef,
      setHeadlessBuyError,
      setIsFooterVisible,
      setIsHeadlessBuyInProgress,
      setIsTransactionDataUpdating,
      setIsTransactionValueUpdating,
      setIsConfirmationSubmitting,
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
