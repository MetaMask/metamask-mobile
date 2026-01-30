import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import PerpsLoadingSkeleton from '../components/PerpsLoadingSkeleton';
import { usePerpsConnectionLifecycle } from '../hooks/usePerpsConnectionLifecycle';
import { isE2E } from '../../../../util/test/utils';
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView';
import type { ReconnectOptions } from '../types/perps-types';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

export interface PerpsConnectionContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  resetError: () => void;
  reconnectWithNewContext: (options?: ReconnectOptions) => Promise<void>;
}

export const PerpsConnectionContext =
  createContext<PerpsConnectionContextValue | null>(null);

interface PerpsConnectionProviderProps {
  children: React.ReactNode;
  isVisible?: boolean;
  isFullScreen?: boolean;
}

/**
 * Provider that manages WebSocket connections for Perps components
 * Uses a singleton connection manager to share state between screen and modal stacks
 * Automatically connects when mounted and disconnects when unmounted
 * Only disconnects when all providers have unmounted
 */
export const PerpsConnectionProvider: React.FC<
  PerpsConnectionProviderProps
> = ({ children, isVisible, isFullScreen = false }) => {
  const [connectionState, setConnectionState] = useState(() =>
    PerpsConnectionManager.getConnectionState(),
  );
  const [retryAttempts, setRetryAttempts] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Poll connection state to sync with singleton
  useEffect(() => {
    // Skip polling in E2E mode to prevent timer interference
    if (isE2E) {
      // Set mock connected state for E2E
      setConnectionState({
        isConnected: true,
        isConnecting: false,
        isInitialized: true,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: null,
      });
      return;
    }

    const updateState = () => {
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState((prevState) => {
        // Only update if state has actually changed
        if (
          prevState.isConnected !== state.isConnected ||
          prevState.isConnecting !== state.isConnecting ||
          prevState.isInitialized !== state.isInitialized ||
          prevState.isDisconnecting !== state.isDisconnecting ||
          prevState.isInGracePeriod !== state.isInGracePeriod ||
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
      Logger.error(err as Error, {
        message: 'PerpsConnectionProvider: Error during connect',
        context: 'PerpsConnectionProvider.connect',
      });
    }
    // Always update state after connect attempt
    const state = PerpsConnectionManager.getConnectionState();
    setConnectionState((prevState) => {
      // Only update if state has actually changed
      if (
        prevState.isConnected !== state.isConnected ||
        prevState.isConnecting !== state.isConnecting ||
        prevState.isInitialized !== state.isInitialized ||
        prevState.isDisconnecting !== state.isDisconnecting ||
        prevState.isInGracePeriod !== state.isInGracePeriod ||
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
      Logger.error(err as Error, {
        message: 'PerpsConnectionProvider: Error during disconnect',
        context: 'PerpsConnectionProvider.disconnect',
      });
    }
    // Always update state after disconnect attempt
    const state = PerpsConnectionManager.getConnectionState();
    setConnectionState((prevState) => {
      // Only update if state has actually changed
      if (
        prevState.isConnected !== state.isConnected ||
        prevState.isConnecting !== state.isConnecting ||
        prevState.isInitialized !== state.isInitialized ||
        prevState.isDisconnecting !== state.isDisconnecting ||
        prevState.isInGracePeriod !== state.isInGracePeriod ||
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

  // Reconnect with new context for stuck connections
  const reconnectWithNewContext = useCallback(
    async (options?: ReconnectOptions) => {
      try {
        // Use the existing reconnectWithNewContext method from the singleton
        await PerpsConnectionManager.reconnectWithNewContext(options);
      } catch (err) {
        Logger.error(err as Error, {
          message: 'PerpsConnectionProvider: Error during reconnect',
          context: 'PerpsConnectionProvider.reconnectWithNewContext',
        });
      }
      // Always update state after reconnection attempt
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
    },
    [],
  );

  // Use the connection lifecycle hook to manage visibility and app state
  usePerpsConnectionLifecycle({
    isVisible,
    onConnect: async () => {
      try {
        await PerpsConnectionManager.connect();
      } catch (err) {
        Logger.error(err as Error, {
          message: 'PerpsConnectionProvider: Error in lifecycle onConnect',
          context:
            'PerpsConnectionProvider.usePerpsConnectionLifecycle.onConnect',
        });
      }
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
    },
    onDisconnect: async () => {
      try {
        await PerpsConnectionManager.disconnect();
      } catch (err) {
        Logger.error(err as Error, {
          message: 'PerpsConnectionProvider: Error in lifecycle onDisconnect',
          context:
            'PerpsConnectionProvider.usePerpsConnectionLifecycle.onDisconnect',
        });
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
      reconnectWithNewContext,
    }),
    [
      connectionState.isConnected,
      connectionState.isConnecting,
      connectionState.isInitialized,
      connectionState.error,
      connect,
      disconnect,
      resetError,
      reconnectWithNewContext,
    ],
  );

  // Environment-level error handling - show error screen if connection failed
  // This ensures NO Perps screen can render when there's a connection error
  if (connectionState.error) {
    // Determine if back button should be shown based on navigation context
    // Always show back button when in full screen mode (e.g., stack navigator)
    // Also show it after retry attempts for other contexts
    const shouldShowBackButton = isFullScreen || retryAttempts > 0;

    const handleRetry = async () => {
      // Increment retry attempts first to ensure back button shows immediately
      setRetryAttempts((prev) => prev + 1);

      try {
        // Use reconnectWithNewContext with force flag for full reset including WebSocket and cached data
        // This ensures we properly recover from stuck connection states by canceling any pending operations
        await PerpsConnectionManager.reconnectWithNewContext({ force: true });

        // If we reach here, connection succeeded
        // Reset retry attempts and let polling update the state
        setRetryAttempts(0);
      } catch (err) {
        // Keep retry attempts count for showing back button after failed attempts
        Logger.error(ensureError(err), {
          feature: PERPS_CONSTANTS.FeatureName,
          message: `Retry connection failed (attempt ${retryAttempts})`,
        });
      }

      // Force update to get the latest error state
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
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
