import { useEffect, useRef, useCallback } from 'react';
import { usePerpsConnection } from './usePerpsConnection';
import Engine from '../../../../core/Engine';
import { WebSocketConnectionState } from '@metamask/perps-controller';
import { useWebSocketHealthToastContext } from '../components/PerpsWebSocketHealthToast';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';

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
  // Track if we've experienced a disconnection — used to gate the "back online" toast
  // so we only show it after a real outage, not on initial connection.
  const hasExperiencedDisconnectionRef = useRef(false);
  // Track if the current disconnect/reconnect cycle was intentional (account/network switch).
  // isDisconnecting is cleared on the singleton before the Connected event fires, so we
  // latch the value here when the cycle starts and clear it on Connected.
  const isIntentionalReconnectRef = useRef(false);
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

          // Handle first callback after mount/remount.
          // The subscription (BehaviorSubject-style) fires immediately with the current
          // internal state, which begins as Disconnected and only becomes Connected once
          // the WS handshake completes. We must not show a toast on this initial snapshot
          // because we have no prior context — we don't know if this is a genuine offline
          // state or just a stale initial value. Wait for a real state transition instead.
          if (previousWsState === null) {
            previousWsStateRef.current = newState;
            // If already Connected on mount, that's the happy path — no toast needed.
            // If Disconnected/Connecting on mount, we also skip the banner here; a real
            // state change will trigger the switch-case below once the WS settles.
            return;
          }

          // Read isDisconnecting directly from the singleton — always live,
          // no React render cycle delay.
          const isIntentionalReconnect =
            PerpsConnectionManager.getConnectionState().isDisconnecting;

          // Latch intentional reconnect flag when the cycle starts (Disconnected/Connecting).
          // isDisconnecting is cleared on the singleton before Connected fires, so we
          // preserve the value in a ref for the Connected handler.
          if (isIntentionalReconnect) {
            isIntentionalReconnectRef.current = true;
          }

          // Track any transition away from Connected so we can show "back online" later,
          // but only for unintentional disconnects.
          if (wasWsConnected && !isNowConnected && !isIntentionalReconnect) {
            hasExperiencedDisconnectionRef.current = true;
          }

          // Handle state transitions
          switch (newState) {
            case WebSocketConnectionState.Disconnected:
              if (isIntentionalReconnect) {
                // Intentional reconnect (account/network/provider switch) — skip offline toast
                clearShowBannerDelayTimer();
                scheduleAutoRetry();
                break;
              }
              // Any post-snapshot Disconnected state is worth showing — whether it's a
              // direct drop from Connected or a failed reconnection attempt.
              hasExperiencedDisconnectionRef.current = true;
              scheduleShowBanner(
                WebSocketConnectionState.Disconnected,
                attempt,
              );
              scheduleAutoRetry();
              break;

            case WebSocketConnectionState.Connecting:
              clearAutoRetryTimer();
              hide();
              if (!isIntentionalReconnect) {
                // Only arm "back online" and show banner for unintentional reconnects
                hasExperiencedDisconnectionRef.current = true;
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
              // Show connected toast only after a real (unintentional) outage
              if (
                hasExperiencedDisconnectionRef.current &&
                !isIntentionalReconnectRef.current
              ) {
                show(WebSocketConnectionState.Connected, attempt);
              }
              // Reset flags after connection restored
              hasExperiencedDisconnectionRef.current = false;
              isIntentionalReconnectRef.current = false;
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
