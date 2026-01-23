import { useEffect, useRef, useCallback } from 'react';
import { usePerpsConnection } from './usePerpsConnection';
import Engine from '../../../../core/Engine';
import { WebSocketConnectionState } from '../controllers/types';
import { useWebSocketHealthToastContext } from '../components/PerpsWebSocketHealthToast';

/** Delay before automatically attempting to reconnect after disconnection */
const AUTO_RETRY_DELAY_MS = 10000;

/**
 * Hook to monitor WebSocket connection health and trigger toast notifications
 * when the connection is lost or restored.
 *
 * This hook leverages the HyperLiquidClientService's health check mechanism
 * by subscribing to WebSocket connection state changes from the PerpsController.
 * This is event-based, not polling-based, so it reacts immediately to state changes.
 *
 * Uses the WebSocketHealthToastContext to show/hide toasts at the App level,
 * ensuring the toast appears on top of all other content.
 *
 * Behavior:
 * - On initial connection (fresh mount with CONNECTED state): No toast shown
 * - On mount/remount with DISCONNECTED or CONNECTING state: Toast shown immediately
 * - On state transitions after mount: Toast shown for reconnection scenarios
 * - Auto-retry: After 10 seconds in DISCONNECTED state, automatically attempts reconnection
 */
export function useWebSocketHealthToast(): void {
  const { isConnected, isInitialized } = usePerpsConnection();
  const { show, hide, setOnRetry } = useWebSocketHealthToastContext();

  // Track the previous WebSocket state for transition detection
  const previousWsStateRef = useRef<WebSocketConnectionState | null>(null);
  // Track if we've experienced a disconnection after being connected
  // This is used to distinguish initial connection from reconnection
  const hasExperiencedDisconnectionRef = useRef(false);
  // Timer for auto-retry
  const autoRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Clear auto-retry timer helper
  const clearAutoRetryTimer = useCallback(() => {
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current);
      autoRetryTimeoutRef.current = null;
    }
  }, []);

  // Set up the retry callback
  const handleRetry = useCallback(() => {
    // Clear any pending auto-retry when manual retry is triggered
    clearAutoRetryTimer();
    Engine.context.PerpsController?.reconnect?.();
  }, [clearAutoRetryTimer]);

  // Schedule auto-retry after a delay
  const scheduleAutoRetry = useCallback(() => {
    clearAutoRetryTimer();
    autoRetryTimeoutRef.current = setTimeout(() => {
      Engine.context.PerpsController?.reconnect?.();
    }, AUTO_RETRY_DELAY_MS);
  }, [clearAutoRetryTimer]);

  // Register retry callback on mount
  useEffect(() => {
    setOnRetry(handleRetry);
  }, [setOnRetry, handleRetry]);

  // Subscribe to WebSocket connection state changes
  useEffect(() => {
    // Only subscribe when the PerpsConnectionManager says we're connected and initialized
    if (!isConnected || !isInitialized) {
      return;
    }

    // Subscribe to connection state changes from the controller
    const unsubscribe =
      Engine.context.PerpsController?.subscribeToConnectionState?.(
        (newState: WebSocketConnectionState, attempt: number) => {
          const previousWsState = previousWsStateRef.current;
          const wasWsConnected =
            previousWsState === WebSocketConnectionState.CONNECTED;
          const isNowConnected =
            newState === WebSocketConnectionState.CONNECTED;

          // Handle first callback after mount/remount
          if (previousWsState === null) {
            previousWsStateRef.current = newState;

            // If we mount/remount and the connection is already in a problematic state,
            // show the toast immediately. This handles the case where a user navigates
            // away from Perps and returns while the WebSocket is disconnected or reconnecting.
            if (newState === WebSocketConnectionState.DISCONNECTED) {
              hasExperiencedDisconnectionRef.current = true;
              show(WebSocketConnectionState.DISCONNECTED, attempt);
              // Schedule auto-retry for disconnected state
              scheduleAutoRetry();
            } else if (newState === WebSocketConnectionState.CONNECTING) {
              hasExperiencedDisconnectionRef.current = true;
              show(WebSocketConnectionState.CONNECTING, attempt);
              // Clear auto-retry when reconnecting (connection attempt in progress)
              clearAutoRetryTimer();
            }
            // If CONNECTED on mount, this is normal initial state - no toast needed
            return;
          }

          // Detect any transition away from CONNECTED as a disconnection event
          if (wasWsConnected && !isNowConnected) {
            hasExperiencedDisconnectionRef.current = true;
          }

          // Handle state transitions
          switch (newState) {
            case WebSocketConnectionState.DISCONNECTED:
              // Show disconnected toast if:
              // 1. We were previously connected (direct disconnect), OR
              // 2. We've been trying to reconnect and gave up (max attempts reached)
              if (wasWsConnected || hasExperiencedDisconnectionRef.current) {
                show(WebSocketConnectionState.DISCONNECTED, attempt);
                // Schedule auto-retry for disconnected state
                scheduleAutoRetry();
              }
              break;

            case WebSocketConnectionState.CONNECTING:
              // Clear auto-retry when reconnecting (connection attempt in progress)
              clearAutoRetryTimer();
              // Show connecting toast when reconnecting (after a disconnection)
              if (hasExperiencedDisconnectionRef.current) {
                show(WebSocketConnectionState.CONNECTING, attempt);
              }
              break;

            case WebSocketConnectionState.CONNECTED:
              // Clear auto-retry when connected
              clearAutoRetryTimer();
              // Show connected toast only if we've experienced a disconnection before
              if (hasExperiencedDisconnectionRef.current) {
                show(WebSocketConnectionState.CONNECTED, attempt);
                // Reset the flag after successful reconnection
                hasExperiencedDisconnectionRef.current = false;
              }
              break;

            default:
              // DISCONNECTING state - no toast needed
              clearAutoRetryTimer();
              break;
          }

          // Update the previous state ref
          previousWsStateRef.current = newState;
        },
      );

    return () => {
      unsubscribe?.();
      clearAutoRetryTimer();
      hide();
    };
  }, [
    isConnected,
    isInitialized,
    show,
    hide,
    scheduleAutoRetry,
    clearAutoRetryTimer,
  ]);
}
