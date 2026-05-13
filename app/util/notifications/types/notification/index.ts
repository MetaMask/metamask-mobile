export type { INotification } from '@metamask/notification-services-controller/notification-services';

export enum PressActionId {
  OPEN_HOME = 'open-home-press-action-id',
  OPEN_NOTIFICATIONS_VIEW = 'open-notifications-view-press-action-id',
}

// 'default' tells Notifee to use the activity declared in AndroidManifest.xml
// as the app's launcher (resolves to io.metamask.MainActivity for the main
// flavor, io.metamask.qa.MainActivity for qa, etc.).
// Was previously the literal 'com.metamask.ui.MainActivity' which is stale
// from an older package name and threw at runtime when Notifee tried to
// construct the press-action Intent — meaning all notification taps were
// silently inert.
export const LAUNCH_ACTIVITY = 'default';

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
