import { TRIGGER_TYPES } from '@metamask/notification-services-controller/notification-services';
import { strings } from '../../../../../locales/i18n';
import { ModalFieldType, ModalFooterType } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  formatAmount,
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
} from '../../methods/common';

type LidoReadyWithDrawnNotification =
  ExtractedNotification<TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN>;

const isLidoReadyWithDrawnNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN,
]);

const state: NotificationState<LidoReadyWithDrawnNotification> = {
  guardFn: isLidoReadyWithDrawnNotification,
  createMenuItem: (notification) => ({
    title: strings(`notifications.menu_item_title.${notification.type}`),

    description: {
      start: strings(
        `notifications.menu_item_description.${notification.type}`,
        { symbol: notification.payload.data.staked_eth.symbol },
      ),
    },

    image: {
      url: notification.payload.data.staked_eth.image,
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt.toString(),
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.payload.chain_id,
    );

    return {
      title: strings('notifications.modal.title_untake_ready'),
      createdAt: notification.createdAt.toString(),
      fields: [
        {
          type: ModalFieldType.ADDRESS,
          label: strings('notifications.modal.label_account'),
          address: notification.payload.address,
        },
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_unstake_ready'),
          description: notification.payload.data.staked_eth.symbol,
          amount: `${formatAmount(
            parseFloat(notification.payload.data.staked_eth.amount),
            { shouldEllipse: true },
          )} ${notification.payload.data.staked_eth.symbol}`,
          usdAmount: `$${formatAmount(
            parseFloat(notification.payload.data.staked_eth.usd),
            { shouldEllipse: true },
          )}`,
          tokenIconUrl: notification.payload.data.staked_eth.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: ModalFieldType.TRANSACTION,
          txHash: notification.payload.tx_hash,
        },
        {
          type: ModalFieldType.STAKING_PROVIDER,
          stakingProvider: notification.payload.data.staked_eth.symbol,
          tokenIconUrl: notification.payload.data.staked_eth.image,
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
