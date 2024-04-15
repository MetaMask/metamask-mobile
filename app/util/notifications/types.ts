export const NotificationTypes = {
  transaction: 'transaction',
  marketing: 'marketing',
} as const;

export type NotificationTypesType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];

export const NotificationTransactionTypes = {
  pending: 'pending',
  pending_deposit: 'pending_deposit',
  pending_withdrawal: 'pending_withdrawal',
  success: 'success',
  speedup: 'speedup',
  success_withdrawal: 'success_withdrawal',
  success_deposit: 'success_deposit',
  error: 'error',
  cancelled: 'cancelled',
  received: 'received',
  received_payment: 'received_payment',
} as const;

export type NotificationTransactionTypesType =
  (typeof NotificationTransactionTypes)[keyof typeof NotificationTransactionTypes];

export interface MarketingNotificationData {
  type: 'marketing';
  route?: string;
  routeProps?: string;
}

export enum NotificationsKindTypes {
  transaction = 'transaction',
  announcements = 'announcements',
}
