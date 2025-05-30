export type { INotification } from '@metamask/notification-services-controller/notification-services';

export enum PressActionId {
  OPEN_HOME = 'open-home-press-action-id',
  OPEN_NOTIFICATIONS_VIEW = 'open-notifications-view-press-action-id',
}

export const LAUNCH_ACTIVITY = 'com.metamask.ui.MainActivity';

export const NotificationTypes = {
  TRANSACTION: 'transaction',
  SIMPLE: 'simple',
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
