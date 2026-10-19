import {
  TRIGGER_TYPES,
  INotification,
} from '@metamask/notification-services-controller/notification-services';
import { ImageSourcePropType } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { ModalFieldType } from '../../constants';
import { getNotificationBadge } from '../../methods/common';
import { NotificationMenuItem } from './NotificationMenuItem';
import {
  ModalField,
  NotificationModalDetails,
} from './NotificationModalDetails';
import { ExtractedNotification } from '../node-guard';

type GuardFn<T extends INotification = INotification> = (
  n: INotification,
) => n is T;

export interface NotificationState<T extends INotification = INotification> {
  guardFn:
    | GuardFn<T>
    | [GuardFn<T>, validateOtherProperties?: (t: T) => boolean];
  createMenuItem: (n: T) => NotificationMenuItem;
  createModalDetails?: (n: T) => NotificationModalDetails;
}

type ERC20Notification = ExtractedNotification<
  TRIGGER_TYPES.ERC20_RECEIVED | TRIGGER_TYPES.ERC20_SENT
>;
type ERC721Notification = ExtractedNotification<
  TRIGGER_TYPES.ERC721_RECEIVED | TRIGGER_TYPES.ERC721_SENT
>;

type ERC1155Notification = ExtractedNotification<
  TRIGGER_TYPES.ERC1155_RECEIVED | TRIGGER_TYPES.ERC1155_SENT
>;
type NativeSentReceiveNotification = ExtractedNotification<
  TRIGGER_TYPES.ETH_RECEIVED | TRIGGER_TYPES.ETH_SENT
>;

type SentReceivedNotification =
  | ERC20Notification
  | ERC721Notification
  | ERC1155Notification
  | NativeSentReceiveNotification;

interface TemplatedNotification {
  type: INotification['type'];
  createdAt: INotification['createdAt'];
  template?: {
    title: string;
    body?: string;
  };
}

const isSent = (
  n:
    | NativeSentReceiveNotification
    | ERC20Notification
    | ERC1155Notification
    | ERC721Notification,
) =>
  n.type === TRIGGER_TYPES.ETH_SENT ||
  n.type === TRIGGER_TYPES.ERC20_SENT ||
  n.type === TRIGGER_TYPES.ERC721_SENT ||
  n.type === TRIGGER_TYPES.ERC1155_SENT;

export const label_address_from = (n: SentReceivedNotification): string =>
  isSent(n)
    ? strings('notifications.modal.label_address_from_you')
    : strings('notifications.modal.label_address_from');

export const label_address_to = (n: SentReceivedNotification): string =>
  isSent(n)
    ? strings('notifications.modal.label_address_to')
    : strings('notifications.modal.label_address_to_you');

export const createTemplateMenuItem = (
  notification: TemplatedNotification,
  imageUrl: string | ImageSourcePropType,
): NotificationMenuItem => ({
  title: notification.template?.title ?? '',
  description: {
    start: notification.template?.body ?? '',
  },
  image: {
    url: imageUrl,
  },
  badgeIcon: getNotificationBadge(notification.type),
  createdAt: notification.createdAt.toString(),
});

export const getSentReceivedModalFields = (
  notification: SentReceivedNotification,
): ModalField[] => [
  {
    type: ModalFieldType.ADDRESS,
    label: label_address_from(notification),
    address: notification.payload.data.from,
  },
  {
    type: ModalFieldType.ADDRESS,
    label: label_address_to(notification),
    address: notification.payload.data.to,
  },
  {
    type: ModalFieldType.TRANSACTION,
    txHash: notification.payload.tx_hash,
  },
];
