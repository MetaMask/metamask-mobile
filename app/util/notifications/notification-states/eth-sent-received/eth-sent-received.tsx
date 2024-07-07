import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
  shortenAddress,
  formatAmount,
  getNetworkFees,
} from '../../notification.util';

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
  const address = shortenAddress(isSent(n) ? n.data.to : n.data.from);
  return strings(`notifications.menu_item_title.${n.type}`, {
    address,
  });
};

const state: NotificationState<NativeSentReceiveNotification> = {
  guardFn: isNativeTokenNotification,
  createMenuItem: (notification) => {
    const tokenDetails = getNativeTokenDetailsByChainId(notification.chain_id);

    return {
      title: title(notification),

      description: {
        start: tokenDetails?.name ?? '',
        end: tokenDetails
          ? `${formatAmount(parseFloat(notification.data.amount.eth), {
              shouldEllipse: true,
            })} ${tokenDetails.symbol}`
          : '',
      },

      image: {
        url: tokenDetails?.image,
      },

      badgeIcon: getNotificationBadge(notification.type),

      createdAt: notification.createdAt,
    };
  },
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.chain_id,
    );
    return {
      title: isSent(notification)
        ? strings('notifications.modal.title_sent', {
            symbol: nativeTokenDetails?.symbol ?? '',
          })
        : strings('notifications.modal.title_received', {
            symbol: nativeTokenDetails?.symbol ?? '',
          }),
      createdAt: notification.createdAt,
      fields: [
        {
          type: 'ModalField-Address',
          label: isSent(notification)
            ? strings('notifications.modal.label_address_to_you')
            : strings('notifications.modal.label_address_to'),
          address: notification.data.to,
        },
        {
          type: 'ModalField-Address',
          label: isSent(notification)
            ? strings('notifications.modal.label_address_from')
            : strings('notifications.modal.label_address_from_you'),
          address: notification.data.from,
        },
        {
          type: 'ModalField-Transaction',
          txHash: notification.tx_hash,
        },
        {
          type: 'ModalField-Asset',
          label: strings('notifications.modal.label_asset'),
          description: nativeTokenDetails?.name ?? '',
          amount: `${formatAmount(parseFloat(notification.data.amount.eth), {
            shouldEllipse: true,
          })} ${nativeTokenDetails?.symbol}`,
          usdAmount: `$${formatAmount(
            parseFloat(notification.data.amount.usd),
            {
              shouldEllipse: true,
            },
          )}`,
          tokenIconUrl: nativeTokenDetails?.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: 'ModalField-Network',
          iconUrl: nativeTokenDetails?.image,
          name: nativeTokenDetails?.name,
        },
        {
          type: 'ModalField-NetworkFee',
          getNetworkFees: () => getNetworkFees(notification),
        },
      ],
      footer: {
        type: 'ModalFooter-BlockExplorer',
        chainId: notification.chain_id,
        txHash: notification.tx_hash,
      },
    };
  },
};

export default state;
