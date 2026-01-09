import { WebSocketConnectionState } from '../../controllers/types';

/**
 * Props for the PerpsWebSocketHealthToast component.
 */
export interface PerpsWebSocketHealthToastProps {
  /**
   * Whether the toast is visible.
   */
  isVisible: boolean;

  /**
   * The current WebSocket connection state to display.
   */
  connectionState: WebSocketConnectionState;

  /**
   * The current reconnection attempt number (only relevant for CONNECTING state).
   */
  reconnectionAttempt?: number;

  /**
   * Callback when the toast should be hidden (after timeout for success state).
   */
  onHide?: () => void;

  /**
   * Callback when the retry button is pressed (only shown in DISCONNECTED state).
   */
  onRetry?: () => void;

  /**
   * Test ID for the component.
   */
  testID?: string;
}

/**
 * Configuration for a toast state (title, description, icon color).
 */
export interface ToastStateConfig {
  title: string;
  description: string;
  iconColor: string;
}
