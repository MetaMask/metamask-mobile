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
}
