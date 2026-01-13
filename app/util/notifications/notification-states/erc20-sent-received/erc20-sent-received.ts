import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
import { ModalFieldType, ModalFooterType } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import {
  label_address_from,
  label_address_to,
  NotificationState,
} from '../types/NotificationState';
import {
  getAmount,
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
} from '../../methods/common';
import { getTokenAmount, getTokenUSDAmount } from '../token-amounts';
import { formatAddress } from '../../../address';

type ERC20Notification = ExtractedNotification<
  TRIGGER_TYPES.ERC20_RECEIVED | TRIGGER_TYPES.ERC20_SENT
>;

const isERC20Notification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ERC20_RECEIVED,
  TRIGGER_TYPES.ERC20_SENT,
]);

const isSent = (n: ERC20Notification) => n.type === TRIGGER_TYPES.ERC20_SENT;

const menuTitle = (n: ERC20Notification) => {
  const address = formatAddress(
    isSent(n) ? n.payload.data.to : n.payload.data.from,
    'short',
  );
  return strings(`notifications.menu_item_title.${n.type}`, {
    address,
  });
};

const modalTitle = (n: ERC20Notification) =>
  isSent(n)
    ? strings('notifications.modal.title_sent', {
        symbol: n.payload.data.token.symbol,
      })
    : strings('notifications.modal.title_received', {
        symbol: n.payload.data.token.symbol,
      });

const state: NotificationState<ERC20Notification> = {
  guardFn: [
    isERC20Notification,
    (notification) =>
      !!getNativeTokenDetailsByChainId(notification.payload.chain_id),
  ],
  createMenuItem: (notification) => ({
    title: menuTitle(notification),

    description: {
      start: notification.payload.data.token.name,
      end: `${getAmount(
        notification.payload.data.token.amount,
        notification.payload.data.token.decimals,
        {
          shouldEllipse: true,
        },
      )} ${notification.payload.data.token.symbol}`,
    },

    image: {
      url: notification.payload.data.token.image,
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt.toString(),
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.payload.chain_id,
    );
    return {
      title: modalTitle(notification),
      createdAt: notification.createdAt.toString(),
      fields: [
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
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_asset'),
          description: notification.payload.data.token.name,
          amount: getTokenAmount(notification.payload.data.token),
          usdAmount: getTokenUSDAmount(notification.payload.data.token),
          tokenIconUrl: notification.payload.data.token.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: ModalFieldType.NETWORK,
          iconUrl: nativeTokenDetails?.image,
          name: nativeTokenDetails?.name,
        },
      ],
      footer: {
        type: ModalFooterType.BLOCK_EXPLORER,
        chainId: notification.payload.chain_id,
        txHash: notification.payload.tx_hash,
      },
    };
  },
};

export default state;
