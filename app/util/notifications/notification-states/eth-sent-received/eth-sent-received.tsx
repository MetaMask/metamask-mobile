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
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
  formatAmount,
} from '../../methods/common';
import { formatAddress } from '../../../address';

type NativeSentReceiveNotification = ExtractedNotification<
  TRIGGER_TYPES.ETH_RECEIVED | TRIGGER_TYPES.ETH_SENT
>;
const isNativeTokenNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ETH_RECEIVED,
  TRIGGER_TYPES.ETH_SENT,
]);

const isSent = (n: NativeSentReceiveNotification) =>
  n.type === TRIGGER_TYPES.ETH_SENT;

const title = (n: NativeSentReceiveNotification) => {
  const address = formatAddress(
    isSent(n) ? n.payload.data.to : n.payload.data.from,
    'short',
  );
  return strings(`notifications.menu_item_title.${n.type}`, {
    address,
  });
};

const state: NotificationState<NativeSentReceiveNotification> = {
  guardFn: [
    isNativeTokenNotification,
    (notification) =>
      !!getNativeTokenDetailsByChainId(notification.payload.chain_id),
  ],
  createMenuItem: (notification) => {
    const tokenDetails = getNativeTokenDetailsByChainId(
      notification.payload.chain_id,
    );

    return {
      title: title(notification),

      description: {
        start: tokenDetails?.name ?? '',
        end: tokenDetails
          ? `${formatAmount(parseFloat(notification.payload.data.amount.eth), {
              shouldEllipse: true,
            })} ${tokenDetails.symbol}`
          : '',
      },

      image: {
        url: tokenDetails?.image,
      },

      badgeIcon: getNotificationBadge(notification.type),

      createdAt: notification.createdAt.toString(),
    };
  },
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.payload.chain_id,
    );
    return {
      title: isSent(notification)
        ? strings('notifications.modal.title_sent', {
            symbol: nativeTokenDetails?.symbol ?? '',
          })
        : strings('notifications.modal.title_received', {
            symbol: nativeTokenDetails?.symbol ?? '',
          }),
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
          description: nativeTokenDetails?.name ?? '',
          amount: `${formatAmount(
            parseFloat(notification.payload.data.amount.eth),
            {
              shouldEllipse: true,
            },
          )} ${nativeTokenDetails?.symbol}`,
          usdAmount: `$${formatAmount(
            parseFloat(notification.payload.data.amount.usd),
            {
              shouldEllipse: true,
            },
          )}`,
          tokenIconUrl: nativeTokenDetails?.image,
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
