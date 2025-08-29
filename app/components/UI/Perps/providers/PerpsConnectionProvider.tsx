import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../locales/i18n';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import PerpsLoadingSkeleton from '../components/PerpsLoadingSkeleton';

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
}

/**
 * Provider that manages WebSocket connections for Perps components
 * Uses a singleton connection manager to share state between screen and modal stacks
 * Automatically connects when mounted and disconnects when unmounted
 * Only disconnects when all providers have unmounted
 */
export const PerpsConnectionProvider: React.FC<
  PerpsConnectionProviderProps
> = ({ children }) => {
  const [connectionState, setConnectionState] = useState(() =>
    PerpsConnectionManager.getConnectionState(),
  );
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Poll connection state to sync with singleton
  useEffect(() => {
    const updateState = () => {
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState((prevState) => {
        // Only update if state has actually changed
        if (
          prevState.isConnected !== state.isConnected ||
          prevState.isConnecting !== state.isConnecting ||
          prevState.isInitialized !== state.isInitialized
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
    setError(null);
    try {
      await PerpsConnectionManager.connect();
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState((prevState) => {
        // Only update if state has actually changed
        if (
          prevState.isConnected !== state.isConnected ||
          prevState.isConnecting !== state.isConnecting ||
          prevState.isInitialized !== state.isInitialized
        ) {
          return state;
        }
        return prevState;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMessage);
    }
  }, []);

  // Stable disconnect function that uses the singleton
  const disconnect = useCallback(async () => {
    try {
      await PerpsConnectionManager.disconnect();
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState((prevState) => {
        // Only update if state has actually changed
        if (
          prevState.isConnected !== state.isConnected ||
          prevState.isConnecting !== state.isConnecting ||
          prevState.isInitialized !== state.isInitialized
        ) {
          return state;
        }
        return prevState;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown disconnection error';
      setError(errorMessage);
    }
  }, []);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Connect on mount, disconnect on unmount using singleton
  useEffect(() => {
    DevLogger.log('PerpsConnectionProvider: Component mounted', {
      timestamp: new Date().toISOString(),
    });

    // Connect using the singleton manager
    const initializeConnection = async () => {
      try {
        await PerpsConnectionManager.connect();
        const state = PerpsConnectionManager.getConnectionState();
        setConnectionState((prevState) => {
          // Only update if state has actually changed
          if (
            prevState.isConnected !== state.isConnected ||
            prevState.isConnecting !== state.isConnecting ||
            prevState.isInitialized !== state.isInitialized
          ) {
            return state;
          }
          return prevState;
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown connection error';
        setError(errorMessage);
      }
    };

    initializeConnection();

    // Disconnect when provider unmounts
    return () => {
      DevLogger.log('PerpsConnectionProvider: Component unmounting', {
        timestamp: new Date().toISOString(),
      });

      PerpsConnectionManager.disconnect();
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isConnected: connectionState.isConnected,
      isConnecting: connectionState.isConnecting,
      isInitialized: connectionState.isInitialized,
      error,
      connect,
      disconnect,
      resetError,
    }),
    [
      connectionState.isConnected,
      connectionState.isConnecting,
      connectionState.isInitialized,
      error,
      connect,
      disconnect,
      resetError,
    ],
  );

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
