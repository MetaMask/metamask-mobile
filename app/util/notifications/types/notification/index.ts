import { NotificationServicesController } from '@metamask/notification-services-controller';
import type { FC } from 'react';
import { TRIGGER_TYPES } from '../../constants';

/**
 * The shape of a "generic" notification.
 * Other than the fields listed below, tt will also contain:
 * - `type` field (declared in the Raw shapes)
 * - `data` field (declared in the Raw shapes)
 */
export type Notification = NotificationServicesController.Types.INotification;

export type HandleNotificationCallback = (
  data: Notification['data'] | undefined
) => void

export enum PressActionId {
  OPEN_NOTIFICATIONS_VIEW = 'open-notifications-view-press-action-id',
  OPEN_TRANSACTIONS_VIEW = 'open-transactions-view-press-action-id'
}

export const LAUNCH_ACTIVITY = 'com.metamask.ui.MainActivity';

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
  eth_received: 'eth_received',
  features_announcement: 'features_announcement',
  metamask_swap_completed: 'metamask_swap_completed',
  erc20_sent: 'erc20_sent',
  erc20_received: 'erc20_received',
  eth_sent: 'eth_sent',
  rocketpool_stake_completed: 'rocketpool_stake_completed',
  rocketpool_unstake_completed: 'rocketpool_unstake_completed',
  lido_stake_completed: 'lido_stake_completed',
  lido_withdrawal_requested: 'lido_withdrawal_requested',
  lido_withdrawal_completed: 'lido_withdrawal_completed',
  lido_stake_ready_to_be_withdrawn: 'lido_stake_ready_to_be_withdrawn',
  erc721_sent: 'erc721_sent',
  erc721_received: 'erc721_received',
  erc1155_sent: 'erc1155_sent',
  erc1155_received: 'erc1155_received',
} as const;

export type NotificationTransactionTypesType =
  (typeof NotificationTransactionTypes)[keyof typeof NotificationTransactionTypes];

export interface MarketingNotificationData {
  type: 'marketing';
  route?: string;
  routeProps?: string;
}

export const STAKING_PROVIDER_MAP: Record<
NotificationServicesController.Constants.TRIGGER_TYPES.LIDO_STAKE_COMPLETED
| NotificationServicesController.Constants.TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED
| NotificationServicesController.Constants.TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED
| NotificationServicesController.Constants.TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED,
  string
> = {
  [TRIGGER_TYPES.LIDO_STAKE_COMPLETED]: 'Lido-staked ETH',
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED]: 'Lido-staked ETH',
  [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED]: 'Rocket Pool-staked ETH',
  [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED]: 'Rocket Pool-staked ETH',
};

export interface SimpleNotification {
  title?: string;
  body?: string;
  data?: {
    [key: string]: string | object | number;
  };
}
