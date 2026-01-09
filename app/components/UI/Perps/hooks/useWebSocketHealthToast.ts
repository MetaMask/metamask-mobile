import { useEffect, useRef, useCallback } from 'react';
import { usePerpsConnection } from './usePerpsConnection';
import Engine from '../../../../core/Engine';
import { WebSocketConnectionState } from '../controllers/types';
import { useWebSocketHealthToastContext } from '../components/PerpsWebSocketHealthToast';

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
 * Note: Only shows toasts after the initial connection has been established.
 * This prevents showing reconnection toasts during the initial connection phase.
 */
export function useWebSocketHealthToast(): void {
  const { isConnected, isInitialized } = usePerpsConnection();
  const { show, hide, setOnRetry } = useWebSocketHealthToastContext();

  // Track the previous WebSocket state for transition detection
  const previousWsStateRef = useRef<WebSocketConnectionState | null>(null);
  // Track if we've experienced a disconnection after being connected
  // This is used to distinguish initial connection from reconnection
  const hasExperiencedDisconnectionRef = useRef(false);

  // Set up the retry callback
  const handleRetry = useCallback(() => {
    Engine.context.PerpsController?.reconnect?.();
  }, []);

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

          // Only show toasts after we've been connected at least once
          // This prevents showing toasts during initial connection
          if (previousWsState === null) {
            previousWsStateRef.current = newState;
            return;
          }

          // Detect any transition away from CONNECTED as a disconnection event
          if (wasWsConnected && !isNowConnected) {
            hasExperiencedDisconnectionRef.current = true;
          }

          // Handle state transitions
          switch (newState) {
            case WebSocketConnectionState.DISCONNECTED:
              // Show disconnected if we were previously connected
              if (wasWsConnected) {
                show(WebSocketConnectionState.DISCONNECTED, attempt);
              }
              break;

            case WebSocketConnectionState.CONNECTING:
              // Show connecting toast when reconnecting (after a disconnection)
              if (hasExperiencedDisconnectionRef.current) {
                show(WebSocketConnectionState.CONNECTING, attempt);
              }
              break;

            case WebSocketConnectionState.CONNECTED:
              // Show connected toast only if we've experienced a disconnection before
              if (hasExperiencedDisconnectionRef.current) {
                show(WebSocketConnectionState.CONNECTED, attempt);
                // Reset the flag after successful reconnection
                hasExperiencedDisconnectionRef.current = false;
              }
              break;

            default:
              // DISCONNECTING state - no toast needed
              break;
          }

          // Update the previous state ref
          previousWsStateRef.current = newState;
        },
      );

    return () => {
      unsubscribe?.();
      hide();
    };
  }, [isConnected, isInitialized, show, hide]);
}
