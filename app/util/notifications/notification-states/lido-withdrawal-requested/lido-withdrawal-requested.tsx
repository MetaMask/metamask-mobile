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
import { getTokenAmount } from '../token-amounts';

type LidoWithdrawalRequestedNotification =
  ExtractedNotification<TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED>;

const isLidoWithdrawalRequestedNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED,
]);

const state: NotificationState<LidoWithdrawalRequestedNotification> = {
  guardFn: isLidoWithdrawalRequestedNotification,
  createMenuItem: (notification) => {
    const amount = getAmount(
      notification.payload.data.stake_in.amount,
      notification.payload.data.stake_in.decimals,
      { shouldEllipse: true },
    );
    const symbol = notification.payload.data.stake_in.symbol;
    return {
      title: strings(`notifications.menu_item_title.${notification.type}`),

      description: {
        start: strings(
          `notifications.menu_item_description.${notification.type}`,
          { amount, symbol },
        ),
      },

      image: {
        url: notification.payload.data.stake_in.image,
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
      title: strings('notifications.modal.title_unstake_requested'),
      createdAt: notification.createdAt.toString(),
      fields: [
        {
          type: ModalFieldType.ADDRESS,
          label: strings('notifications.modal.label_account'),
          address: notification.payload.address,
        },
        {
          type: ModalFieldType.ASSET,
          label: strings('notifications.modal.label_unstaking_requested'),
          description: notification.payload.data.stake_in.symbol,
          amount: getTokenAmount(notification.payload.data.stake_in),
          usdAmount: getTokenAmount(notification.payload.data.stake_in),
          tokenIconUrl: notification.payload.data.stake_in.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: ModalFieldType.TRANSACTION,
          txHash: notification.payload.tx_hash,
        },
        {
          type: ModalFieldType.STAKING_PROVIDER,
          stakingProvider: 'Lido-staked ETH',
          tokenIconUrl: notification.payload.data.stake_in.image,
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
