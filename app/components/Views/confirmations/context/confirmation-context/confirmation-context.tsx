import { noop } from 'lodash';
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ConfirmationNavHeaderConfig } from '../../components/UI/navbar/navbar';

export interface ConfirmationContextParams {
  mmPayRequestInProgressNavHandler: React.MutableRefObject<
    (() => void) | false
  >;
  /** Inline full-screen nav header config set by useNavbar; rendered by Confirm. */
  navHeaderConfig: ConfirmationNavHeaderConfig | null;
  headlessBuyError: string | undefined;
  isFooterVisible?: boolean;
  isConfirmationSubmitting: boolean;
  isConfirmationSubmittingRef: React.RefObject<boolean>;
  isHeadlessBuyInProgress: boolean;
  isTransactionValueUpdating: boolean;
  isTransactionDataUpdating: boolean;
  // Whether the user selected the maximum amount for a money account deposit.
  // Shared so the insufficient-funds alert can skip a Max deposit that only
  // marginally exceeds the balance due to fiat rounding.
  isMaxDeposit: boolean;
  setNavHeaderConfig: (config: ConfirmationNavHeaderConfig | null) => void;
  setHeadlessBuyError: (error: string | undefined) => void;
  setIsConfirmationSubmitting: (isConfirmationSubmitting: boolean) => void;
  setIsFooterVisible: (isFooterVisible: boolean) => void;
  setIsHeadlessBuyInProgress: (isHeadlessBuyInProgress: boolean) => void;
  setIsTransactionValueUpdating: (isTransactionValueUpdating: boolean) => void;
  setIsTransactionDataUpdating: (isTransactionDataUpdating: boolean) => void;
  setIsMaxDeposit: (isMaxDeposit: boolean) => void;
}

// This context is used to share the valuable information between the components
// that are used to render the confirmation
const ConfirmationContext = React.createContext<ConfirmationContextParams>({
  mmPayRequestInProgressNavHandler: { current: false },
  navHeaderConfig: null,
  headlessBuyError: undefined,
  isFooterVisible: true,
  isConfirmationSubmitting: false,
  isConfirmationSubmittingRef: { current: false },
  isHeadlessBuyInProgress: false,
  isTransactionDataUpdating: false,
  isTransactionValueUpdating: false,
  isMaxDeposit: false,
  setNavHeaderConfig: noop,
  setHeadlessBuyError: noop,
  setIsConfirmationSubmitting: noop,
  setIsFooterVisible: noop,
  setIsHeadlessBuyInProgress: noop,
  setIsTransactionDataUpdating: noop,
  setIsTransactionValueUpdating: noop,
  setIsMaxDeposit: noop,
});

interface ConfirmationContextProviderProps {
  children: React.ReactNode;
}

export const ConfirmationContextProvider: React.FC<
  ConfirmationContextProviderProps
> = ({ children }) => {
  const mmPayRequestInProgressNavHandler = useRef<(() => void) | false>(false);

  const [navHeaderConfig, setNavHeaderConfig] =
    useState<ConfirmationNavHeaderConfig | null>(null);

  const [isTransactionValueUpdating, setIsTransactionValueUpdating] =
    useState(false);

  const [isFooterVisible, setIsFooterVisible] = useState<boolean>();

  const [headlessBuyError, setHeadlessBuyError] = useState<
    string | undefined
  >();

  const [isHeadlessBuyInProgress, setIsHeadlessBuyInProgress] = useState(false);

  const [isTransactionDataUpdating, setIsTransactionDataUpdating] =
    useState<boolean>(false);

  const [isMaxDeposit, setIsMaxDeposit] = useState<boolean>(false);

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
      navHeaderConfig,
      headlessBuyError,
      isFooterVisible,
      isHeadlessBuyInProgress,
      isTransactionDataUpdating,
      isTransactionValueUpdating,
      isConfirmationSubmitting,
      isConfirmationSubmittingRef,
      isMaxDeposit,
      setNavHeaderConfig,
      setHeadlessBuyError,
      setIsFooterVisible,
      setIsHeadlessBuyInProgress,
      setIsTransactionDataUpdating,
      setIsTransactionValueUpdating,
      setIsConfirmationSubmitting,
      setIsMaxDeposit,
    }),
    [
      mmPayRequestInProgressNavHandler,
      navHeaderConfig,
      headlessBuyError,
      isFooterVisible,
      isHeadlessBuyInProgress,
      isTransactionDataUpdating,
      isTransactionValueUpdating,
      isConfirmationSubmitting,
      isConfirmationSubmittingRef,
      isMaxDeposit,
      setHeadlessBuyError,
      setIsFooterVisible,
      setIsHeadlessBuyInProgress,
      setIsTransactionDataUpdating,
      setIsTransactionValueUpdating,
      setIsConfirmationSubmitting,
      setIsMaxDeposit,
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
