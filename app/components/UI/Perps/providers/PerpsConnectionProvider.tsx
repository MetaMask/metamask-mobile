import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePerpsController } from '../hooks/usePerpsController';

interface PerpsConnectionContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  resetError: () => void;
}

const PerpsConnectionContext = createContext<PerpsConnectionContextValue | null>(null);

interface PerpsConnectionProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that manages WebSocket connections for Perps components
 * Automatically connects when mounted and disconnects when unmounted
 * Only disconnects when leaving the entire Perps trading environment
 * SDK handles reconnection automatically, so we just track connection state
 */
export const PerpsConnectionProvider: React.FC<PerpsConnectionProviderProps> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { controller } = usePerpsController();
  const isMountedRef = useRef(true);
  const controllerRef = useRef(controller);

  // Update controller ref when it changes
  controllerRef.current = controller;

  // Stable connect function - SDK handles reconnection
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);

    try {
      DevLogger.log('PerpsConnectionProvider: Initializing connection', {
        timestamp: new Date().toISOString(),
      });

      // Connection is handled by the controller's providers
      // We just need to track the connection state
      await controller.getAccountState(); // This will trigger connection if needed

      if (isMountedRef.current) {
        setIsConnected(true);
        DevLogger.log('PerpsConnectionProvider: Successfully connected', {
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';

      if (isMountedRef.current) {
        setError(errorMessage);
        DevLogger.log('PerpsConnectionProvider: Connection failed', {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    }
  }, [controller, isConnecting, isConnected]);

  // Stable disconnect function
  const disconnect = useCallback(async () => {
    if (!isConnected && !isConnecting) return;

    try {
      DevLogger.log('PerpsConnectionProvider: Disconnecting from Perps trading environment', {
        timestamp: new Date().toISOString(),
      });

      await controller.disconnect();

      if (isMountedRef.current) {
        setIsConnected(false);
        setIsConnecting(false);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown disconnection error';
      DevLogger.log('PerpsConnectionProvider: Disconnection error', {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      if (isMountedRef.current) {
        setError(errorMessage);
      }
    }
  }, [controller, isConnected, isConnecting]);

  // Reset error state
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Connect on mount, disconnect only when leaving entire Perps section
  useEffect(() => {
    isMountedRef.current = true;

    DevLogger.log('PerpsConnectionProvider: Entering Perps trading environment', {
      timestamp: new Date().toISOString(),
    });

    // Connect immediately on mount
    const initializeConnection = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        DevLogger.log('PerpsConnectionProvider: Initializing connection', {
          timestamp: new Date().toISOString(),
        });

        await controllerRef.current.getAccountState(); // This will trigger connection if needed

        if (isMountedRef.current) {
          setIsConnected(true);
          DevLogger.log('PerpsConnectionProvider: Successfully connected', {
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';

        if (isMountedRef.current) {
          setError(errorMessage);
          DevLogger.log('PerpsConnectionProvider: Connection failed', {
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });
        }
      } finally {
        if (isMountedRef.current) {
          setIsConnecting(false);
        }
      }
    };

    initializeConnection();

    // Cleanup only when leaving the entire Perps trading environment
    return () => {
      isMountedRef.current = false;

      DevLogger.log('PerpsConnectionProvider: Leaving Perps trading environment', {
        timestamp: new Date().toISOString(),
      });

      // Disconnect when provider unmounts (user leaves entire Perps section)
      controllerRef.current.disconnect();
    };
  }, []); // Empty dependency array - only run once on mount

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      isConnected,
      isConnecting,
      error,
      connect,
      disconnect,
      resetError,
    }),
    [isConnected, isConnecting, error, connect, disconnect, resetError]
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
    throw new Error('usePerpsConnection must be used within a PerpsConnectionProvider');
  }
  return context;
};
