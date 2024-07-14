import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  getAmount,
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
} from '../../notification.util';
import { getTokenAmount } from '../token-amounts';

type LidoWithdrawalRequestedNotification =
  ExtractedNotification<TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED>;

const isLidoWithdrawalRequestedNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED,
]);

const state: NotificationState<LidoWithdrawalRequestedNotification> = {
  guardFn: isLidoWithdrawalRequestedNotification,
  createMenuItem: (notification) => {
    const amount = `${getAmount(
      notification.data.stake_in.amount,
      notification.data.stake_in.decimals,
      { shouldEllipse: true },
    )}`;
    const symbol = notification.data.stake_in.symbol;
    return {
      title: strings(`notifications.menu_item_title.${notification.type}`),

      description: {
        start: strings(
          `notifications.menu_item_description.${notification.type}`,
          { amount, symbol },
        ),
      },

      image: {
        url: notification.data.stake_in.image,
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
      title: strings('notifications.modal.title_unstake_requested'),
      createdAt: notification.createdAt,
      fields: [
        {
          type: 'ModalField-Address',
          label: strings('notifications.modal.label_account'),
          address: notification.address,
        },
        {
          type: 'ModalField-Asset',
          label: strings('notifications.modal.label_unstaking_requested'),
          description: notification.data.stake_in.symbol,
          amount: getTokenAmount(notification.data.stake_in),
          usdAmount: getTokenAmount(notification.data.stake_in),
          tokenIconUrl: notification.data.stake_in.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: 'ModalField-Transaction',
          txHash: notification.tx_hash,
        },
        {
          type: 'ModalField-StakingProvider',
          stakingProvider: 'Lido-staked ETH',
          tokenIconUrl: notification.data.stake_in.image,
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
