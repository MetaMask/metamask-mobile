import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import Device from '../../../../util/device';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

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
 * - App state (disconnect after 20s when backgrounded)
 *
 * This hook ensures optimal battery and network usage by:
 * - Immediately disconnecting when tab is not visible
 * - Delaying disconnection by 20s when app is backgrounded (for quick returns)
 * - Using BackgroundTimer to ensure timers run even when app is suspended
 */
export function usePerpsConnectionLifecycle({
  isVisible,
  onConnect,
  onDisconnect,
  onError,
}: UsePerpsConnectionLifecycleParams): UsePerpsConnectionLifecycleReturn {
  const hasConnected = useRef(false);
  const lastAppState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundDisconnectTimer = useRef<number | null>(null);

  // Helper to cancel background timer
  const cancelBackgroundTimer = useCallback(() => {
    if (backgroundDisconnectTimer.current) {
      if (Device.isAndroid()) {
        BackgroundTimer.clearTimeout(backgroundDisconnectTimer.current);
      } else {
        clearTimeout(backgroundDisconnectTimer.current);
        BackgroundTimer.stop();
      }
      backgroundDisconnectTimer.current = null;
    }
  }, []);

  // Helper to schedule background disconnection
  const scheduleBackgroundDisconnection = useCallback(() => {
    DevLogger.log(
      `usePerpsConnectionLifecycle: Scheduling disconnection in ${PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY}ms`,
    );

    if (Device.isIos()) {
      // iOS requires starting/stopping BackgroundTimer
      BackgroundTimer.start();
      backgroundDisconnectTimer.current = setTimeout(() => {
        hasConnected.current = false;
        onDisconnect();
        backgroundDisconnectTimer.current = null;
        BackgroundTimer.stop();
      }, PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY) as unknown as number;
    } else if (Device.isAndroid()) {
      // Android uses BackgroundTimer.setTimeout directly
      backgroundDisconnectTimer.current = BackgroundTimer.setTimeout(() => {
        hasConnected.current = false;
        onDisconnect();
        backgroundDisconnectTimer.current = null;
      }, PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY);
    }
  }, [onDisconnect]);

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

  // Handle disconnection
  const handleDisconnection = useCallback(() => {
    if (hasConnected.current) {
      hasConnected.current = false;
      onDisconnect();
    }
  }, [onDisconnect]);

  // Handle tab visibility changes
  useEffect(() => {
    if (isVisible === undefined) {
      // If visibility is not provided (e.g., in modal stack), don't manage based on visibility
      return;
    }

    if (isVisible === false && hasConnected.current) {
      // Tab is not visible - disconnect immediately
      cancelBackgroundTimer(); // Cancel any pending background timer
      handleDisconnection();
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
  }, [isVisible, cancelBackgroundTimer, handleConnection, handleDisconnection]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        lastAppState.current === 'active' &&
        nextAppState.match(/inactive|background/) &&
        hasConnected.current
      ) {
        // App going to background - schedule disconnection
        scheduleBackgroundDisconnection();
      } else if (
        lastAppState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App coming to foreground
        cancelBackgroundTimer();

        // Reconnect if needed and visible
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
      cancelBackgroundTimer();
    };
  }, [
    isVisible,
    scheduleBackgroundDisconnection,
    cancelBackgroundTimer,
    handleConnection,
  ]);

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
      cancelBackgroundTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally only run on mount/unmount

  return {
    hasConnected: hasConnected.current,
  };
}
