import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { strings } from '../../../../../locales/i18n';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import PerpsLoadingSkeleton from '../components/PerpsLoadingSkeleton';
import { usePerpsDepositStatus } from '../hooks/usePerpsDepositStatus';
import { usePerpsWithdrawStatus } from '../hooks/usePerpsWithdrawStatus';
import { usePerpsConnectionLifecycle } from '../hooks/usePerpsConnectionLifecycle';

interface PerpsConnectionContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  resetError: () => void;
}

const PerpsConnectionContext =
  createContext<PerpsConnectionContextValue | null>(null);

interface PerpsConnectionProviderProps {
  children: React.ReactNode;
  isVisible?: boolean;
}

/**
 * Provider that manages WebSocket connections for Perps components
 * Uses a singleton connection manager to share state between screen and modal stacks
 * Automatically connects when mounted and disconnects when unmounted
 * Only disconnects when all providers have unmounted
 */
export const PerpsConnectionProvider: React.FC<
  PerpsConnectionProviderProps
> = ({ children, isVisible }) => {
  const [connectionState, setConnectionState] = useState(() =>
    PerpsConnectionManager.getConnectionState(),
  );
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Enable deposit status monitoring and toasts at the provider level
  // This ensures it runs only once for all Perps screens
  usePerpsDepositStatus();

  // Enable withdrawal status monitoring and toasts at the provider level
  usePerpsWithdrawStatus();

  // Poll connection state to sync with singleton
  useEffect(() => {
    const updateState = () => {
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState((prevState) => {
        // Only update if state has actually changed
        if (
          prevState.isConnected !== state.isConnected ||
          prevState.isConnecting !== state.isConnecting ||
          prevState.isInitialized !== state.isInitialized ||
          prevState.error !== state.error
        ) {
          return state;
        }
        return prevState;
      });
    };

    // Poll every 100ms for state changes
    pollIntervalRef.current = setInterval(updateState, 100);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Stable connect function that uses the singleton
  const connect = useCallback(async () => {
    try {
      await PerpsConnectionManager.connect();
    } catch (err) {
      // Error is already handled by connection manager
      // Just let it propagate for components that need to handle it
    }
    // Always update state after connect attempt
    const state = PerpsConnectionManager.getConnectionState();
    setConnectionState((prevState) => {
      // Only update if state has actually changed
      if (
        prevState.isConnected !== state.isConnected ||
        prevState.isConnecting !== state.isConnecting ||
        prevState.isInitialized !== state.isInitialized ||
        prevState.error !== state.error
      ) {
        return state;
      }
      return prevState;
    });
  }, []);

  // Stable disconnect function that uses the singleton
  const disconnect = useCallback(async () => {
    try {
      await PerpsConnectionManager.disconnect();
    } catch (err) {
      // Error is already handled by connection manager
      // Just let it propagate for components that need to handle it
    }
    // Always update state after disconnect attempt
    const state = PerpsConnectionManager.getConnectionState();
    setConnectionState((prevState) => {
      // Only update if state has actually changed
      if (
        prevState.isConnected !== state.isConnected ||
        prevState.isConnecting !== state.isConnecting ||
        prevState.isInitialized !== state.isInitialized ||
        prevState.error !== state.error
      ) {
        return state;
      }
      return prevState;
    });
  }, []);

  // Reset error state
  const resetError = useCallback(() => {
    PerpsConnectionManager.resetError();
    // Update state to reflect error cleared
    const state = PerpsConnectionManager.getConnectionState();
    setConnectionState(state);
  }, []);

  // Use the connection lifecycle hook to manage visibility and app state
  usePerpsConnectionLifecycle({
    isVisible,
    onConnect: async () => {
      try {
        await PerpsConnectionManager.connect();
      } catch (err) {
        // Error is handled by connection manager
      }
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
    },
    onDisconnect: async () => {
      try {
        await PerpsConnectionManager.disconnect();
      } catch (err) {
        // Error is handled by connection manager
      }
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
    },
    onError: () => {
      // Errors are now managed by connection manager
      // Just update state to get the latest error
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
    },
  });

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isConnected: connectionState.isConnected,
      isConnecting: connectionState.isConnecting,
      isInitialized: connectionState.isInitialized,
      error: connectionState.error,
      connect,
      disconnect,
      resetError,
    }),
    [
      connectionState.isConnected,
      connectionState.isConnecting,
      connectionState.isInitialized,
      connectionState.error,
      connect,
      disconnect,
      resetError,
    ],
  );

  // Show skeleton loading UI while connection is initializing
  // This prevents components from trying to load data before the connection is ready
  // Don't show skeleton if there's an error (let the child components handle it)
  if (
    (connectionState.isConnecting || !connectionState.isInitialized) &&
    !connectionState.error
  ) {
    return (
      <PerpsConnectionContext.Provider value={contextValue}>
        <PerpsLoadingSkeleton />
      </PerpsConnectionContext.Provider>
    );
  }

  return (
    <PerpsConnectionContext.Provider value={contextValue}>
      {children}
    </PerpsConnectionContext.Provider>
  );
};

/**
 * Hook to access the Perps connection context
 */
export const usePerpsConnection = (): PerpsConnectionContextValue => {
  const context = useContext(PerpsConnectionContext);
  if (!context) {
    throw new Error(strings('perps.errors.connectionRequired'));
  }
  return context;
};
