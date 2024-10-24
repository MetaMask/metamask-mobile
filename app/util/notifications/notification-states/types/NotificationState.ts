import { NotificationServicesController } from '@metamask/notification-services-controller';
import { strings } from '../../../../../locales/i18n';
import { NotificationMenuItem } from './NotificationMenuItem';
import { NotificationModalDetails } from './NotificationModalDetails';

import { ExtractedNotification } from '../node-guard';
import { Notification } from '../../../../util/notifications';

export interface NotificationState<T extends Notification = Notification> {
  guardFn: (n: Notification) => n is T;
  createMenuItem: (n: T) => NotificationMenuItem;
  createModalDetails?: (n: T) => NotificationModalDetails;
}

const { TRIGGER_TYPES } = NotificationServicesController.Constants;
type TRIGGER_TYPES = NotificationServicesController.Constants.TRIGGER_TYPES;

type ERC20Notification = ExtractedNotification<
NotificationServicesController.Constants.TRIGGER_TYPES.ERC20_RECEIVED | NotificationServicesController.Constants.TRIGGER_TYPES.ERC20_SENT
>;
type ERC721Notification = ExtractedNotification<
NotificationServicesController.Constants.TRIGGER_TYPES.ERC721_RECEIVED | NotificationServicesController.Constants.TRIGGER_TYPES.ERC721_SENT
>;

type ERC1155Notification = ExtractedNotification<
NotificationServicesController.Constants.TRIGGER_TYPES.ERC1155_RECEIVED | NotificationServicesController.Constants.TRIGGER_TYPES.ERC1155_SENT
>;
type NativeSentReceiveNotification = ExtractedNotification<
NotificationServicesController.Constants.TRIGGER_TYPES.ETH_RECEIVED | NotificationServicesController.Constants.TRIGGER_TYPES.ETH_SENT
>;

type INotification =
  | ERC20Notification
  | ERC721Notification
  | ERC1155Notification
  | NativeSentReceiveNotification;
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

export const label_address_from = (n: INotification): string =>
  isSent(n)
    ? strings('notifications.modal.label_address_from_you')
    : strings('notifications.modal.label_address_from');

export const label_address_to = (n: INotification): string =>
  isSent(n)
    ? strings('notifications.modal.label_address_to')
    : strings('notifications.modal.label_address_to_you');
