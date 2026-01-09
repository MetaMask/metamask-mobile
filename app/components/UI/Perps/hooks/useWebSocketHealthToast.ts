import { useEffect, useRef, useState, useCallback } from 'react';
import { usePerpsConnection } from './usePerpsConnection';
import Engine from '../../../../core/Engine';
import { WebSocketConnectionState } from '../controllers/types';

/**
 * State returned by the useWebSocketHealthToast hook for rendering the toast.
 */
export interface WebSocketHealthToastState {
  /**
   * Whether the toast should be visible.
   */
  isVisible: boolean;

  /**
   * The current WebSocket connection state to display.
   */
  connectionState: WebSocketConnectionState;

  /**
   * The current reconnection attempt number (only relevant for CONNECTING state).
   */
  reconnectionAttempt: number;

  /**
   * Callback to hide the toast (used after success auto-hide timeout).
   */
  onHide: () => void;
}

/**
 * Hook to monitor WebSocket connection health and provide state for toast notifications
 * when the connection is lost or restored.
 *
 * This hook leverages the HyperLiquidClientService's health check mechanism
 * by subscribing to WebSocket connection state changes from the PerpsController.
 * This is event-based, not polling-based, so it reacts immediately to state changes.
 *
 * Returns state for rendering a custom toast:
 * - isVisible: true when toast should be shown
 * - connectionState: current WebSocket state (DISCONNECTED, CONNECTING, CONNECTED)
 * - reconnectionAttempt: current attempt number (for CONNECTING state)
 * - onHide: callback to hide the toast
 *
 * Note: Only shows toasts after the initial connection has been established.
 * This prevents showing reconnection toasts during the initial connection phase.
 */
export function useWebSocketHealthToast(): WebSocketHealthToastState {
  const { isConnected, isInitialized } = usePerpsConnection();

  // Toast visibility state
  const [isVisible, setIsVisible] = useState(false);
  const [connectionState, setConnectionState] =
    useState<WebSocketConnectionState>(WebSocketConnectionState.DISCONNECTED);
  const [reconnectionAttempt, setReconnectionAttempt] = useState(0);

  // Track the previous WebSocket state for transition detection
  const previousWsStateRef = useRef<WebSocketConnectionState | null>(null);
  // Track if we've experienced a disconnection after being connected
  // This is used to distinguish initial connection from reconnection
  const hasExperiencedDisconnectionRef = useRef(false);

  // Callback to hide the toast
  const onHide = useCallback(() => {
    setIsVisible(false);
  }, []);

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
                setConnectionState(WebSocketConnectionState.DISCONNECTED);
                setReconnectionAttempt(attempt);
                setIsVisible(true);
              }
              break;

            case WebSocketConnectionState.CONNECTING:
              // Show connecting toast when reconnecting (after a disconnection)
              if (hasExperiencedDisconnectionRef.current) {
                setConnectionState(WebSocketConnectionState.CONNECTING);
                setReconnectionAttempt(attempt);
                setIsVisible(true);
              }
              break;

            case WebSocketConnectionState.CONNECTED:
              // Show connected toast only if we've experienced a disconnection before
              if (hasExperiencedDisconnectionRef.current) {
                setConnectionState(WebSocketConnectionState.CONNECTED);
                setReconnectionAttempt(attempt);
                setIsVisible(true);
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
    };
  }, [isConnected, isInitialized]);

  return {
    isVisible,
    connectionState,
    reconnectionAttempt,
    onHide,
  };
}
