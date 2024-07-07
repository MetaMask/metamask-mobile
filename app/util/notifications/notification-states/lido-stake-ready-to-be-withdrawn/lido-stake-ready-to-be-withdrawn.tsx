import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  formatAmount,
  getNativeTokenDetailsByChainId,
  getNotificationBadge,
} from '../../notification.util';

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
        { symbol: notification.data.staked_eth.symbol },
      ),
    },

    image: {
      url: notification.data.staked_eth.image,
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt,
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.chain_id,
    );

    return {
      title: strings('notifications.modal.title_untake_ready'),
      createdAt: notification.createdAt,
      fields: [
        {
          type: 'ModalField-Address',
          label: strings('notifications.modal.label_account'),
          address: notification.address,
        },
        {
          type: 'ModalField-Asset',
          label: strings('notifications.modal.label_unstake_ready'),
          description: notification.data.staked_eth.symbol,
          amount: `${formatAmount(
            parseFloat(notification.data.staked_eth.amount),
            { shouldEllipse: true },
          )} ${notification.data.staked_eth.symbol}`,
          usdAmount: `$${formatAmount(
            parseFloat(notification.data.staked_eth.usd),
            { shouldEllipse: true },
          )}`,
          tokenIconUrl: notification.data.staked_eth.image,
          tokenNetworkUrl: nativeTokenDetails?.image,
        },
        {
          type: 'ModalField-Transaction',
          txHash: notification.tx_hash,
        },
        {
          type: 'ModalField-StakingProvider',
          stakingProvider: notification.data.staked_eth.symbol,
          tokenIconUrl: notification.data.staked_eth.image,
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
