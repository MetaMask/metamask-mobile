export type BaseNotificationStatus =
  | 'pending'
  | 'pending_deposit'
  | 'pending_withdrawal'
  | 'speedup'
  | 'success'
  | 'success_deposit'
  | 'success_withdrawal'
  | 'received'
  | 'received_payment'
  | 'eth_received'
  | 'cancelled'
  | 'error'
  | 'import_success'
  | 'simple_notification'
  | 'simple_notification_rejected';

export interface BaseNotificationData {
  description?: string | null;
  title?: string | null;
  nonce?: string | number;
  amount?: string | number | object | null;
  assetType?: string;
  type?: string | null;
}

export interface BaseNotificationProps {
  status?: BaseNotificationStatus;
  data?: BaseNotificationData;
  onPress?: () => void;
  onHide?: () => void;
  autoDismiss?: boolean;
  /** When false the notification is not rendered. Defaults to true. */
  isVisible?: boolean;
  /** Called after the exit spring animation completes. */
  onDismissComplete?: () => void;
  /** Auto-dismiss delay in ms. Defaults to NOTIFICATION_VISIBILITY_DURATION (2750ms). */
  dismissDuration?: number;
  /** When true, the notification stays visible until manually dismissed. */
  persistUntilDismiss?: boolean;
}
