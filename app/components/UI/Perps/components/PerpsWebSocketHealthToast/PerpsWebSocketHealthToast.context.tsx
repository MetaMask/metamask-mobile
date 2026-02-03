import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
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

/** Options for hiding the toast (e.g. user swipe dismiss) */
export interface WebSocketHealthToastHideOptions {
  /** When true, toast will not be shown again until connection is restored (Connected state) */
  userDismissed?: boolean;
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
  hide: (options?: WebSocketHealthToastHideOptions) => void;
  onRetry?: () => void;
  setOnRetry: (callback: () => void) => void;
}

const defaultState: WebSocketHealthToastState = {
  isVisible: false,
  connectionState: WebSocketConnectionState.Disconnected,
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
  const [userDismissed, setUserDismissed] = useState(false);
  const [onRetryCallback, setOnRetryCallback] = useState<
    (() => void) | undefined
  >(undefined);

  const show = useCallback(
    (connectionState: WebSocketConnectionState, reconnectionAttempt = 0) => {
      const isConnected =
        connectionState === WebSocketConnectionState.Connected;
      // When connection is restored, clear userDismissed so toast can show again on next disconnect
      if (isConnected) {
        setUserDismissed(false);
      }
      // Don't show Disconnected/Connecting if user previously dismissed (until connection is restored).
      // Connected state always shows to avoid stale-closure: setUserDismissed(false) is async.
      if (userDismissed && !isConnected) {
        return;
      }
      setState({
        isVisible: true,
        connectionState,
        reconnectionAttempt,
      });
    },
    [userDismissed],
  );

  const hide = useCallback((options?: WebSocketHealthToastHideOptions) => {
    if (options?.userDismissed) {
      setUserDismissed(true);
    }
    setState((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const setOnRetry = useCallback((callback: () => void) => {
    setOnRetryCallback(() => callback);
  }, []);

  const contextValue = useMemo(
    () => ({
      state,
      show,
      hide,
      onRetry: onRetryCallback,
      setOnRetry,
    }),
    [state, show, hide, onRetryCallback, setOnRetry],
  );

  return (
    <WebSocketHealthToastContext.Provider value={contextValue}>
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
