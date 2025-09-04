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
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView';

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
  const [retryAttempts, setRetryAttempts] = useState(0);
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

  // Environment-level error handling - show error screen if connection failed
  // This ensures NO Perps screen can render when there's a connection error
  if (connectionState.error) {
    // Determine if back button should be shown based on navigation context
    // For now, only show back button after retry failures (conservative approach)
    // This prevents showing back button in wallet tabs while ensuring escape route exists
    const shouldShowBackButton = retryAttempts > 0;

    const handleRetry = async () => {
      setRetryAttempts((prev) => prev + 1);

      try {
        resetError(); // Clear normal errors
        await connect(); // Attempt reconnection

        // Reset retry attempts on successful connection
        setRetryAttempts(0);
      } catch (err) {
        // Keep retry attempts count for showing back button after failed attempts
        console.error('Retry connection failed:', err);
      }
    };

    return (
      <PerpsConnectionContext.Provider value={contextValue}>
        <PerpsConnectionErrorView
          error={connectionState.error}
          onRetry={handleRetry}
          isRetrying={connectionState.isConnecting}
          showBackButton={shouldShowBackButton}
          retryAttempts={retryAttempts}
        />
      </PerpsConnectionContext.Provider>
    );
  }

  // Show skeleton loading UI while connection is initializing
  // This prevents components from trying to load data before the connection is ready
  if (connectionState.isConnecting || !connectionState.isInitialized) {
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
