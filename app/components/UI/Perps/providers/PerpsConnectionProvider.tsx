import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';

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
 * Automatically connects when mounted and disconnects when unmounted
 * Only disconnects when leaving the entire Perps trading environment
 * SDK handles reconnection automatically, so we just track connection state
 */
export const PerpsConnectionProvider: React.FC<
  PerpsConnectionProviderProps
> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable connect function - SDK handles reconnection
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      DevLogger.log('PerpsConnectionProvider: Initializing connection', {
        timestamp: new Date().toISOString(),
      });

      // Initialize the controller first
      await Engine.context.PerpsController.initializeProviders();

      setIsInitialized(true);
      DevLogger.log('PerpsConnectionProvider: Controller initialized', {
        timestamp: new Date().toISOString(),
      });

      // Connection is handled by the controller's providers
      // We just need to track the connection state
      await Engine.context.PerpsController.getAccountState(); // This will trigger connection if needed

      setIsConnected(true);
      DevLogger.log('PerpsConnectionProvider: Successfully connected', {
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMessage);
      DevLogger.log('PerpsConnectionProvider: Connection failed', {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  // Stable disconnect function
  const disconnect = useCallback(async () => {
    if (!isConnected && !isConnecting) return;

    try {
      DevLogger.log(
        'PerpsConnectionProvider: Disconnecting from Perps trading environment',
        {
          timestamp: new Date().toISOString(),
        },
      );

      await Engine.context.PerpsController.disconnect();

      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown disconnection error';
      DevLogger.log('PerpsConnectionProvider: Disconnection error', {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      setError(errorMessage);
    }
  }, [isConnected, isConnecting]);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    DevLogger.log(
      'PerpsConnectionProvider: Entering Perps trading environment',
      {
        timestamp: new Date().toISOString(),
      },
    );

    // Connect immediately on mount
    const initializeConnection = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        DevLogger.log('PerpsConnectionProvider: Initializing connection', {
          timestamp: new Date().toISOString(),
        });

        // Initialize the controller first
        await Engine.context.PerpsController.initializeProviders();

        setIsInitialized(true);
        DevLogger.log('PerpsConnectionProvider: Controller initialized', {
          timestamp: new Date().toISOString(),
        });

        await Engine.context.PerpsController.getAccountState(); // This will trigger connection if needed

        setIsConnected(true);
        DevLogger.log('PerpsConnectionProvider: Successfully connected', {
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown connection error';
        setError(errorMessage);
        DevLogger.log('PerpsConnectionProvider: Connection failed', {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsConnecting(false);
      }
    };

    initializeConnection();

    // Disconnect when provider unmounts
    return () => {
      DevLogger.log(
        'PerpsConnectionProvider: Leaving Perps trading environment',
        {
          timestamp: new Date().toISOString(),
        },
      );

      Engine.context.PerpsController.disconnect();
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isConnected,
      isConnecting,
      isInitialized,
      error,
      connect,
      disconnect,
      resetError,
    }),
    [
      isConnected,
      isConnecting,
      isInitialized,
      error,
      connect,
      disconnect,
      resetError,
    ],
  );

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
    throw new Error(
      'usePerpsConnection must be used within a PerpsConnectionProvider',
    );
  }
  return context;
};
