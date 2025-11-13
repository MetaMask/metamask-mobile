import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
import { ModalFieldType, ModalFooterType } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  getAmount,
  getNativeTokenDetailsByChainId,
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
      symbolIn: notification.payload.data.token_in.symbol,
      symbolOut: notification.payload.data.token_out.symbol,
    }),

    description: {
      start: notification.payload.data.token_out.symbol,
      end: `${getAmount(
        notification.payload.data.token_out.amount,
        notification.payload.data.token_out.decimals,
        {
          shouldEllipse: true,
        },
      )} ${notification.payload.data.token_out.symbol}`,
    },

    image: {
      url: notification.payload.data.token_out.image,
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt.toString(),
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.payload.chain_id,
    );
    return {
      title: strings('notifications.modal.title_swapped', {
        symbolIn: notification.payload.data.token_in.symbol,
        symbolOut: notification.payload.data.token_out.symbol,
      }),
      createdAt: notification.createdAt.toString(),
      fields: [
        {
          type: ModalFieldType.ADDRESS,
          label: strings('notifications.modal.label_account'),
          address: notification.payload.address,
        },
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_swapped'),
          description: notification.payload.data.token_in.symbol,
          amount: getTokenAmount(notification.payload.data.token_in),
          usdAmount: getTokenUSDAmount(notification.payload.data.token_in),
          tokenIconUrl: notification.payload.data.token_in.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_to'),
          description: notification.payload.data.token_out.symbol,
          amount: getTokenAmount(notification.payload.data.token_out),
          usdAmount: getTokenUSDAmount(notification.payload.data.token_out),
          tokenIconUrl: notification.payload.data.token_out.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: ModalFieldType.TRANSACTION,
          txHash: notification.payload.tx_hash,
        },
        {
          type: ModalFieldType.NETWORK,
          iconUrl: nativeTokenDetails?.image,
          name: nativeTokenDetails?.name,
        },
        {
          type: ModalFieldType.SWAP_RATE,
          rate: `1 ${notification.payload.data.token_out.symbol} ≈ ${(
            1 / parseFloat(notification.payload.data.rate)
          ).toFixed(5)} ${notification.payload.data.token_in.symbol}`,
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
