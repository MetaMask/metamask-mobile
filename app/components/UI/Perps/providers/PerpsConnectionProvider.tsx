import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { addBreadcrumb } from '@sentry/react-native';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { usePerpsConnectionLifecycle } from '../hooks/usePerpsConnectionLifecycle';
import { isE2E } from '../../../../util/test/utils';
import PerpsConnectionErrorView from '../components/PerpsConnectionErrorView';
import {
  PERPS_CONSTANTS,
  type ReconnectOptions,
} from '@metamask/perps-controller';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';

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
  /** When true, silently renders children instead of showing the error view on connection failure. */
  suppressErrorView?: boolean;
  /**
   * When false, disables connect/disconnect lifecycle management in this provider.
   * Use when the top-level PerpsAlwaysOnProvider already manages the connection.
   * Defaults to true.
   */
  manageLifecycle?: boolean;
}

/**
 * Provider that manages WebSocket connections for Perps components.
 * Uses a singleton connection manager to share state between screen and modal stacks.
 * When the tab is explicitly hidden, unmount children so stream hooks stop
 * background retry/subscription work. isVisible === undefined (fullscreen/modal
 * contexts) always renders children.
 */
export const PerpsConnectionProvider: React.FC<
  PerpsConnectionProviderProps
> = ({
  children,
  isVisible,
  isFullScreen = false,
  suppressErrorView = false,
  manageLifecycle = true,
}) => {
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
      const providerName = PerpsConnectionManager.getActiveProviderName();
      Logger.error(ensureError(err, 'PerpsConnectionProvider.connect'), {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          component: 'PerpsConnectionManager',
          action: 'connection_connection',
          ...(providerName && { provider: providerName }),
        },
        context: { name: 'PerpsConnectionProvider.connect', data: {} },
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
      const providerName = PerpsConnectionManager.getActiveProviderName();
      Logger.error(ensureError(err, 'PerpsConnectionProvider.disconnect'), {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          component: 'PerpsConnectionManager',
          action: 'connection_disconnection',
          ...(providerName && { provider: providerName }),
        },
        context: { name: 'PerpsConnectionProvider.disconnect', data: {} },
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
        const providerName = PerpsConnectionManager.getActiveProviderName();
        Logger.error(
          ensureError(err, 'PerpsConnectionProvider.reconnectWithNewContext'),
          {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'PerpsConnectionManager',
              action: 'connection_reconnection',
              ...(providerName && { provider: providerName }),
            },
            context: {
              name: 'PerpsConnectionProvider.reconnectWithNewContext',
              data: {},
            },
          },
        );
      }
      // Always update state after reconnection attempt
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
    },
    [],
  );

  // Use the connection lifecycle hook to manage visibility and app state.
  // When manageLifecycle is false (always-on provider handles it), pass
  // isVisible=false to suppress all connect/disconnect calls from this hook.
  usePerpsConnectionLifecycle({
    isVisible: manageLifecycle ? isVisible : false,
    onConnect: async () => {
      try {
        await PerpsConnectionManager.connect();
      } catch (err) {
        const providerName = PerpsConnectionManager.getActiveProviderName();
        Logger.error(
          ensureError(err, 'PerpsConnectionProvider.lifecycle.onConnect'),
          {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'PerpsConnectionManager',
              action: 'connection_connection',
              ...(providerName && { provider: providerName }),
            },
            context: {
              name: 'PerpsConnectionProvider.lifecycle.onConnect',
              data: {},
            },
          },
        );
      }
      const state = PerpsConnectionManager.getConnectionState();
      setConnectionState(state);
    },
    onDisconnect: async () => {
      try {
        await PerpsConnectionManager.disconnect();
      } catch (err) {
        const providerName = PerpsConnectionManager.getActiveProviderName();
        Logger.error(
          ensureError(err, 'PerpsConnectionProvider.lifecycle.onDisconnect'),
          {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'PerpsConnectionManager',
              action: 'connection_disconnection',
              ...(providerName && { provider: providerName }),
            },
            context: {
              name: 'PerpsConnectionProvider.lifecycle.onDisconnect',
              data: {},
            },
          },
        );
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

  // Sentry breadcrumb: makes error screen appearance visible in issue timelines
  // Placed in useEffect to avoid firing on every re-render (polling is 100ms)
  // retryAttempts intentionally excluded — breadcrumb should fire once per error
  // appearance, not on every retry (retries are tracked in handleRetry breadcrumb)
  useEffect(() => {
    if (connectionState.error) {
      addBreadcrumb({
        category: 'perps.connection',
        message: 'PerpsConnectionErrorView shown',
        level: 'error',
        data: {
          errorCode: connectionState.error,
          retryAttempts,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState.error]);

  // Environment-level error handling - show error screen if connection failed
  // This ensures NO Perps screen can render when there's a connection error
  // When suppressErrorView is true, skip the error view and render children normally
  // so the consuming section can handle the empty state gracefully (e.g., hide itself)
  if (connectionState.error && !suppressErrorView) {
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
        // Breadcrumb only — avoid flooding Sentry with a new event on every retry
        addBreadcrumb({
          category: 'perps.connection',
          message: 'Retry failed',
          level: 'warning',
          data: {
            error: ensureError(err, 'PerpsConnectionProvider.handleRetry')
              .message,
            retryAttempts,
          },
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

  return (
    <PerpsConnectionContext.Provider value={contextValue}>
      {isVisible === false ? null : children}
    </PerpsConnectionContext.Provider>
  );
};
