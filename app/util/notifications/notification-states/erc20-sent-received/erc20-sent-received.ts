import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
import { ModalFieldType, ModalFooterType } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import {
  getSentReceivedModalFields,
  NotificationState,
} from '../types/NotificationState';
import {
  getAmount,
  getNotificationBadge,
  getNetworkDetailsFromNotifPayload,
  getNetworkImageByChainId,
} from '../../methods/common';
import { getTokenAmount, getTokenUSDAmount } from '../token-amounts';

type ERC20Notification = ExtractedNotification<
  TRIGGER_TYPES.ERC20_RECEIVED | TRIGGER_TYPES.ERC20_SENT
>;

const isERC20Notification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ERC20_RECEIVED,
  TRIGGER_TYPES.ERC20_SENT,
]);

const state: NotificationState<ERC20Notification> = {
  guardFn: [
    isERC20Notification,
    (notification) =>
      !!getNetworkDetailsFromNotifPayload(notification.payload.network),
  ],
  createMenuItem: (notification) => ({
    title: notification.template?.title ?? '',

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
    const { networkName } = getNetworkDetailsFromNotifPayload(
      notification?.payload?.network,
    );
    const networkLogo = getNetworkImageByChainId(
      notification?.payload?.chain_id,
    );

    return {
      title: notification.template?.title ?? '',
      createdAt: notification.createdAt.toString(),
      fields: [
        ...getSentReceivedModalFields(notification),
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_asset'),
          description: notification.payload.data.token.name,
          amount: getTokenAmount(notification.payload.data.token),
          usdAmount: getTokenUSDAmount(notification.payload.data.token),
          tokenIconUrl: notification.payload.data.token.image,
          tokenNetworkUrl: networkLogo,
        },
        {
          type: ModalFieldType.NETWORK,
          iconUrl: networkLogo,
          name: `${networkName}`,
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
