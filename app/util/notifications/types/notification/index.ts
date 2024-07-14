import { NotificationServicesController } from '@metamask/notification-services-controller/';

/**
 * The shape of a "generic" notification.
 * Other than the fields listed below, tt will also contain:
 * - `type` field (declared in the Raw shapes)
 * - `data` field (declared in the Raw shapes)
 */
export type Notification = NotificationServicesController.Types.INotification;

export type MarkAsReadNotificationsParam = Pick<
  Notification,
  'id' | 'type' | 'isRead'
>[];

export const NotificationTypes = {
  TRANSACTION: 'transaction',
  SIMPLE: 'simple',
  ANNOUCEMENTS: 'annoucements',
} as const;

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

export interface SimpleNotification {
  title?: string;
  body?: string;
  data?: {
    [key: string]: string | object | number;
  };
}
