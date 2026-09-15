import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
import { ModalFieldType, ModalFooterType } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import {
  getSentReceivedModalFields,
  NotificationState,
} from '../types/NotificationState';
import {
  getNotificationBadge,
  formatAmount,
  getNetworkDetailsFromNotifPayload,
  getNetworkImageByChainId,
} from '../../methods/common';

type NativeSentReceiveNotification = ExtractedNotification<
  TRIGGER_TYPES.ETH_RECEIVED | TRIGGER_TYPES.ETH_SENT
>;
const isNativeTokenNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ETH_RECEIVED,
  TRIGGER_TYPES.ETH_SENT,
]);

const state: NotificationState<NativeSentReceiveNotification> = {
  guardFn: [
    isNativeTokenNotification,
    (notification) =>
      !!getNetworkDetailsFromNotifPayload(notification.payload.network),
  ],
  createMenuItem: (notification) => {
    const networkLogo = getNetworkImageByChainId(notification.payload.chain_id);
    const { networkName, nativeCurrencySymbol } =
      getNetworkDetailsFromNotifPayload(notification.payload.network);

    return {
      title: notification.template?.title ?? '',

      description: {
        start: networkName,
        end: nativeCurrencySymbol
          ? `${formatAmount(parseFloat(notification.payload.data.amount.eth), {
              shouldEllipse: true,
            })} ${nativeCurrencySymbol}`
          : '',
      },

      image: {
        url: networkLogo,
      },

      badgeIcon: getNotificationBadge(notification.type),

      createdAt: notification.createdAt.toString(),
    };
  },
  createModalDetails: (notification) => {
    const networkLogo = getNetworkImageByChainId(notification.payload.chain_id);
    const { networkName, nativeCurrencySymbol } =
      getNetworkDetailsFromNotifPayload(notification.payload.network);
    return {
      title: notification.template?.title ?? '',
      createdAt: notification.createdAt.toString(),
      fields: [
        ...getSentReceivedModalFields(notification),
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_asset'),
          description: networkName,
          amount: `${formatAmount(
            parseFloat(notification.payload.data.amount.eth),
            {
              shouldEllipse: true,
            },
          )} ${nativeCurrencySymbol}`,
          usdAmount: `$${formatAmount(
            parseFloat(notification.payload.data.amount.usd),
            {
              shouldEllipse: true,
            },
          )}`,
          tokenIconUrl: networkLogo,
          tokenNetworkUrl: networkLogo,
        },
        {
          type: ModalFieldType.NETWORK,
          iconUrl: networkLogo,
          name: networkName,
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
