import { strings } from '../../../../../locales/i18n';
import { ModalFieldType, TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  getAmount,
  getNativeTokenDetailsByChainId,
  getNetworkFees,
  getNotificationBadge,
} from '../../methods/common';
import { getTokenAmount, getTokenUSDAmount } from '../token-amounts';

type SwapCompletedNotification =
  ExtractedNotification<TRIGGER_TYPES.METAMASK_SWAP_COMPLETED>;

const isSwapCompletedNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.METAMASK_SWAP_COMPLETED,
]);

const state: NotificationState<SwapCompletedNotification> = {
  guardFn: isSwapCompletedNotification,
  createMenuItem: (notification) => ({
    title: strings(`notifications.menu_item_title.${notification.type}`, {
      symbolIn: notification.data.token_in.symbol,
      symbolOut: notification.data.token_out.symbol,
    }),

    description: {
      start: notification.data.token_out.symbol,
      end: `${getAmount(
        notification.data.token_out.amount,
        notification.data.token_out.decimals,
        {
          shouldEllipse: true,
        },
      )} ${notification.data.token_out.symbol}`,
    },

    image: {
      url: notification.data.token_out.image,
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt.toString(),
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.chain_id,
    );
    return {
      title: strings('notifications.modal.title_swapped', {
        symbol1: notification.data.token_in.symbol,
        symbol2: notification.data.token_out.symbol,
      }),
      createdAt: notification.createdAt.toString(),
      fields: [
        {
          type: ModalFieldType.ADDRESS,
          label: strings('notifications.modal.label_account'),
          address: notification.address,
        },
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_swapped'),
          description: notification.data.token_in.symbol,
          amount: getTokenAmount(notification.data.token_in),
          usdAmount: getTokenUSDAmount(notification.data.token_in),
          tokenIconUrl: notification.data.token_in.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_to'),
          description: notification.data.token_out.symbol,
          amount: getTokenAmount(notification.data.token_out),
          usdAmount: getTokenUSDAmount(notification.data.token_out),
          tokenIconUrl: notification.data.token_out.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: ModalFieldType.TRANSACTION,
          txHash: notification.tx_hash,
        },
        {
          type: ModalFieldType.NETWORK,
          iconUrl: nativeTokenDetails?.image,
          name: nativeTokenDetails?.name,
        },
        {
          type: ModalFieldType.SWAP_RATE,
          rate: `1 ${notification.data.token_out.symbol} ≈ ${(
            1 / parseFloat(notification.data.rate)
          ).toFixed(5)} ${notification.data.token_in.symbol}`,
        },
        {
          type: ModalFieldType.NETWORK_FEE,
          getNetworkFees: () => getNetworkFees(notification),
        },
      ],
    };
  },
};

export default state;
