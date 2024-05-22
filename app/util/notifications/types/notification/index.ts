import type { FC } from 'react';
import type { FeatureAnnouncementRawNotification } from '../featureAnnouncement';
import type { HalRawNotification } from '../halNotification';
import type { Compute } from '../type-utils';

/**
 * The shape of a "generic" notification.
 * Other than the fields listed below, tt will also contain:
 * - `type` field (declared in the Raw shapes)
 * - `data` field (declared in the Raw shapes)
 */
export type Notification = Compute<
  (FeatureAnnouncementRawNotification | HalRawNotification) & {
    id: string;
    createdAt: Date;
    isRead: boolean;
  }
>;

// NFT
export interface NFT {
  token_id: string;
  image: string;
  collection?: {
    name: string;
    image: string;
  };
}

/**
 * NotificationFC is the shared component interface for all notification components
 */
type NotificationFC<N = Notification> = FC<{ notification: N }>;

interface BodyHalNotification<N = Notification> {
  type: 'body_hal_notification';
  Image?: NotificationFC<N>;
  Summary?: NotificationFC<N>;
  TransactionStatus: NotificationFC<N>;
  Data: NotificationFC<N>;
  NetworkFee?: NotificationFC<N>;
}

interface BodyFeatureAnnouncement<N = Notification> {
  type: 'body_feature_announcement';
  Image: NotificationFC<N>;
  Description: NotificationFC<N>;
}

interface FooterHalNotification<N = Notification> {
  type: 'footer_hal_notification';
  ScanLink: NotificationFC<N>;
}

interface FooterFeatureAnnouncement<N = Notification> {
  type: 'footer_feature_announcement';
  Link: NotificationFC<N>;
  Action: NotificationFC<N>;
}

/**
 * This is the object shape that contains all the components of the particular notification.
 * the `guardFn` can be used to narrow a wide notification into the specific notification required.
 */
export interface NotificationComponent<N extends Notification = Notification> {
  guardFn: (n: Notification) => n is N;
  item: {
    Icon: NotificationFC<N>;
    Title: NotificationFC<N>;
    Description?: NotificationFC<N>;
    Amount?: NotificationFC<N>;
  };
  modal: {
    header: {
      Badge?: NotificationFC<N>;
      Title: NotificationFC<N>;
    };
    body: BodyHalNotification<N> | BodyFeatureAnnouncement<N>;
    footer: FooterHalNotification<N> | FooterFeatureAnnouncement<N>;
  };
}

export const NotificationTypes = {
  TRANSACTION: 'transaction',
  SIMPLE: 'simple',
  ANNOUCEMENTS: 'annoucements',
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

export interface SimpleNotification {
  title?: string;
  body?: string;
  data?: {
    [key: string]: string | object | number;
  };
}

export enum NotificationsKindTypes {
  transaction = 'transaction',
  announcements = 'announcements',
}
