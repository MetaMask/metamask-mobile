import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UsePerpsConnectionLifecycleParams {
  isVisible?: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => void | Promise<void>;
  onError?: (error: string) => void;
}

interface UsePerpsConnectionLifecycleReturn {
  hasConnected: boolean;
}

/**
 * Hook that manages the Perps WebSocket connection lifecycle based on:
 * - Tab visibility (connect when visible, disconnect when hidden)
 * - App state (disconnect when backgrounded)
 *
 * This hook ensures optimal battery and network usage by:
 * - Connecting when tab becomes visible and app is active
 * - Disconnecting when tab is hidden or app is backgrounded
 * - The 20-second grace period is handled by PerpsConnectionManager
 * - Provides immediate response to visibility changes
 */
export function usePerpsConnectionLifecycle({
  isVisible,
  onConnect,
  onDisconnect,
  onError,
}: UsePerpsConnectionLifecycleParams): UsePerpsConnectionLifecycleReturn {
  const hasConnected = useRef(false);
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);

  // Handle connection based on current state
  const handleConnection = useCallback(async () => {
    if (!hasConnected.current) {
      hasConnected.current = true;
      try {
        await onConnect();
      } catch (err) {
        hasConnected.current = false;
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown connection error';
        onError?.(errorMessage);
      }
    }
  }, [onConnect, onError]);

  // Handle tab visibility changes
  useEffect(() => {
    if (isVisible === undefined) {
      // If visibility is not provided (e.g., in modal stack), don't manage based on visibility
      return;
    }

    if (isVisible === false && hasConnected.current) {
      // Tab is not visible - disconnect (grace period handled by PerpsConnectionManager)
      hasConnected.current = false;
      onDisconnect();
    } else if (
      isVisible === true &&
      !hasConnected.current &&
      lastAppState.current === 'active'
    ) {
      // Tab is visible and app is active - connect
      // Add small delay to allow any pending disconnection to complete
      const timer = setTimeout(() => {
        if (isVisible === true && !hasConnected.current) {
          handleConnection();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, handleConnection, onDisconnect]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        lastAppState.current === 'active' &&
        nextAppState.match(/inactive|background/) &&
        hasConnected.current
      ) {
        // App going to background - disconnect (grace period handled by PerpsConnectionManager)
        hasConnected.current = false;
        onDisconnect();
      } else if (
        lastAppState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App coming to foreground - reconnect if needed and visible
        if (
          !hasConnected.current &&
          (isVisible === true || isVisible === undefined)
        ) {
          handleConnection();
        }
      }

      lastAppState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription.remove();
    };
  }, [isVisible, handleConnection, onDisconnect]);

  // Initial connection on mount (if visible)
  useEffect(() => {
    if (!hasConnected.current && isVisible !== false) {
      handleConnection();
    }

    // Cleanup on unmount
    return () => {
      if (hasConnected.current) {
        hasConnected.current = false;
        onDisconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally only run on mount/unmount

  return {
    hasConnected: hasConnected.current,
  };
}
