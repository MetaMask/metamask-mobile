import { useEffect, useRef, useCallback } from 'react';
import { usePerpsConnection } from './usePerpsConnection';
import Engine from '../../../../core/Engine';
import { WebSocketConnectionState } from '../controllers/types';
import { useWebSocketHealthToastContext } from '../components/PerpsWebSocketHealthToast';

/** Delay before automatically attempting to reconnect after disconnection */
const AUTO_RETRY_DELAY_MS = 10000;

/** Delay before showing offline/connecting banner to avoid flicker on quick reconnects */
const OFFLINE_BANNER_DELAY_MS = 1000;

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
 * - On mount/remount with DISCONNECTED or CONNECTING state: Toast shown after 1s delay
 * - On state transitions after mount: Offline/connecting toasts shown after 1s delay to avoid flicker on quick reconnects
 * - Connected toast is shown immediately when connection is restored
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
  // Timer for delayed offline/connecting banner (avoids flicker on quick reconnects)
  const showBannerDelayTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // Clear show-banner delay timer (so we don't show after reconnecting)
  const clearShowBannerDelayTimer = useCallback(() => {
    if (showBannerDelayTimeoutRef.current) {
      clearTimeout(showBannerDelayTimeoutRef.current);
      showBannerDelayTimeoutRef.current = null;
    }
  }, []);

  // Show offline/connecting toast after delay (only if still disconnected after delay)
  const scheduleShowBanner = useCallback(
    (connectionState: WebSocketConnectionState, attempt: number) => {
      clearShowBannerDelayTimer();
      showBannerDelayTimeoutRef.current = setTimeout(() => {
        show(connectionState, attempt);
        showBannerDelayTimeoutRef.current = null;
      }, OFFLINE_BANNER_DELAY_MS);
    },
    [clearShowBannerDelayTimer, show],
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
            previousWsState === WebSocketConnectionState.Connected;
          const isNowConnected =
            newState === WebSocketConnectionState.Connected;

          // Handle first callback after mount/remount
          if (previousWsState === null) {
            previousWsStateRef.current = newState;

            // If we mount/remount and the connection is already in a problematic state,
            // show the toast after a delay to avoid flicker on quick reconnects.
            if (newState === WebSocketConnectionState.Disconnected) {
              hasExperiencedDisconnectionRef.current = true;
              scheduleShowBanner(
                WebSocketConnectionState.Disconnected,
                attempt,
              );
              // Schedule auto-retry for disconnected state
              scheduleAutoRetry();
            } else if (newState === WebSocketConnectionState.Connecting) {
              hasExperiencedDisconnectionRef.current = true;
              scheduleShowBanner(WebSocketConnectionState.Connecting, attempt);
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
            case WebSocketConnectionState.Disconnected:
              // Show disconnected toast after delay if:
              // 1. We were previously connected (direct disconnect), OR
              // 2. We've been trying to reconnect and gave up (max attempts reached)
              if (wasWsConnected || hasExperiencedDisconnectionRef.current) {
                scheduleShowBanner(
                  WebSocketConnectionState.Disconnected,
                  attempt,
                );
                // Schedule auto-retry for disconnected state
                scheduleAutoRetry();
              }
              break;

            case WebSocketConnectionState.Connecting:
              // Clear auto-retry when reconnecting (connection attempt in progress)
              clearAutoRetryTimer();
              // Show connecting toast after delay when reconnecting (after a disconnection)
              if (hasExperiencedDisconnectionRef.current) {
                scheduleShowBanner(
                  WebSocketConnectionState.Connecting,
                  attempt,
                );
              }
              break;

            case WebSocketConnectionState.Connected:
              // Clear show-banner delay so we don't show offline toast after reconnecting
              clearShowBannerDelayTimer();
              // Clear auto-retry when connected
              clearAutoRetryTimer();
              // Show connected toast only if we've experienced a disconnection before
              if (hasExperiencedDisconnectionRef.current) {
                show(WebSocketConnectionState.Connected, attempt);
                // Reset the flag after successful reconnection
                hasExperiencedDisconnectionRef.current = false;
              }
              break;

            default:
              // DISCONNECTING state - no toast needed, cancel any pending banner
              clearShowBannerDelayTimer();
              clearAutoRetryTimer();
              break;
          }

          // Update the previous state ref
          previousWsStateRef.current = newState;
        },
      );

    return () => {
      unsubscribe?.();
      clearShowBannerDelayTimer();
      clearAutoRetryTimer();
      hide();
    };
  }, [
    isConnected,
    isInitialized,
    show,
    hide,
    scheduleShowBanner,
    scheduleAutoRetry,
    clearShowBannerDelayTimer,
    clearAutoRetryTimer,
  ]);
}
