import React, { createContext, useContext, useState, useCallback } from 'react';
import { WebSocketConnectionState } from '../../controllers/types';

/** No-op function for context defaults */
const noop = () => undefined;

/**
 * State for the WebSocket health toast.
 */
export interface WebSocketHealthToastState {
  isVisible: boolean;
  connectionState: WebSocketConnectionState;
  reconnectionAttempt: number;
}

/**
 * Context params for controlling the WebSocket health toast.
 */
export interface WebSocketHealthToastContextParams {
  state: WebSocketHealthToastState;
  show: (
    connectionState: WebSocketConnectionState,
    reconnectionAttempt?: number,
  ) => void;
  hide: () => void;
  onRetry?: () => void;
  setOnRetry: (callback: () => void) => void;
}

const defaultState: WebSocketHealthToastState = {
  isVisible: false,
  connectionState: WebSocketConnectionState.DISCONNECTED,
  reconnectionAttempt: 0,
};

export const WebSocketHealthToastContext =
  createContext<WebSocketHealthToastContextParams>({
    state: defaultState,
    show: noop,
    hide: noop,
    onRetry: undefined,
    setOnRetry: noop,
  });

/**
 * Provider for the WebSocket health toast context.
 * Should be rendered at the App level.
 */
export const WebSocketHealthToastProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, setState] = useState<WebSocketHealthToastState>(defaultState);
  const [onRetry, setOnRetryCallback] = useState<(() => void) | undefined>(
    undefined,
  );

  const show = useCallback(
    (connectionState: WebSocketConnectionState, reconnectionAttempt = 0) => {
      setState({
        isVisible: true,
        connectionState,
        reconnectionAttempt,
      });
    },
    [],
  );

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const setOnRetry = useCallback((callback: () => void) => {
    setOnRetryCallback(() => callback);
  }, []);

  return (
    <WebSocketHealthToastContext.Provider
      value={{ state, show, hide, onRetry, setOnRetry }}
    >
      {children}
    </WebSocketHealthToastContext.Provider>
  );
};

/**
 * Hook to access the WebSocket health toast context.
 */
export const useWebSocketHealthToastContext =
  (): WebSocketHealthToastContextParams =>
    useContext(WebSocketHealthToastContext);
