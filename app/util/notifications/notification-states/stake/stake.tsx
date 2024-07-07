import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import {
  getAmount,
  getNativeTokenDetailsByChainId,
  getNetworkFees,
  getNotificationBadge,
} from '../../notification.util';
import { ModalField } from '../types/NotificationModalDetails';
import { getTokenAmount, getTokenUSDAmount } from '../token-amounts';

type StakeNotification = ExtractedNotification<
  | TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED
  | TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED
  | TRIGGER_TYPES.LIDO_STAKE_COMPLETED
  | TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED
>;
const isStakeNotification = isOfTypeNodeGuard([
  TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED,
  TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED,
  TRIGGER_TYPES.LIDO_STAKE_COMPLETED,
  TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED,
]);

const DIRECTION_MAP = {
  [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED]: 'staked',
  [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED]: 'unstaked',
  [TRIGGER_TYPES.LIDO_STAKE_COMPLETED]: 'staked',
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED]: 'unstaked',
} as const;

const STAKING_PROVIDER_MAP = {
  [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED]: 'Rocket Pool-staked ETH',
  [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED]: 'Rocket Pool-staked ETH',
  [TRIGGER_TYPES.LIDO_STAKE_COMPLETED]: 'Lido-staked ETH',
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED]: 'Lido-staked ETH',
};

const isStaked = (n: StakeNotification) => DIRECTION_MAP[n.type] === 'staked';

const descriptionStart = (n: StakeNotification) =>
  isStaked(n) ? n.data.stake_in.symbol : n.data.stake_out.symbol;

const descriptionEnd = (n: StakeNotification) => {
  const token = isStaked(n) ? n.data.stake_in : n.data.stake_out;
  const amount = getAmount(token.amount, token.decimals, {
    shouldEllipse: true,
  });
  const symbol = token.symbol;

  return `${amount} ${symbol}`;
};

const imageUrl = (n: StakeNotification) => {
  const token = isStaked(n) ? n.data.stake_in : n.data.stake_out;
  return token.image;
};

const modalTitle = (n: StakeNotification) => {
  const title = isStaked(n)
    ? strings('notifications.modal.title_stake', {
        symbol: n.data.stake_in.symbol,
      })
    : strings('notifications.modal.title_unstake_completed');

  return title;
};

const state: NotificationState<StakeNotification> = {
  guardFn: isStakeNotification,
  createMenuItem: (notification) => ({
    title: strings(`notifications.menu_item_title.${notification.type}`),

    description: {
      start: descriptionStart(notification),
      end: descriptionEnd(notification),
    },

    image: {
      url: imageUrl(notification),
    },

    badgeIcon: getNotificationBadge(notification.type),

    createdAt: notification.createdAt,
  }),
  createModalDetails: (notification) => {
    const nativeTokenDetails = getNativeTokenDetailsByChainId(
      notification.chain_id,
    );

    const stakedAssetFields: ModalField[] = [
      {
        type: 'ModalField-Asset',
        label: strings('notifications.modal.label_staked'),
        description: notification.data.stake_in.symbol,
        amount: getTokenAmount(notification.data.stake_in),
        usdAmount: getTokenUSDAmount(notification.data.stake_in),
        tokenIconUrl: notification.data.stake_in.image,
        tokenNetworkUrl: nativeTokenDetails?.image,
      },
      {
        type: 'ModalField-Asset',
        label: strings('notifications.modal.label_received'),
        description: notification.data.stake_out.symbol,
        amount: getTokenAmount(notification.data.stake_out),
        usdAmount: getTokenUSDAmount(notification.data.stake_out),
        tokenIconUrl: notification.data.stake_out.image,
        tokenNetworkUrl: nativeTokenDetails?.image,
      },
    ];

    const unstakedAssetFields: ModalField[] = [
      {
        type: 'ModalField-Asset',
        label: strings('notifications.modal.label_unstaking_requested'),
        description: notification.data.stake_in.symbol,
        amount: getTokenAmount(notification.data.stake_in),
        usdAmount: getTokenUSDAmount(notification.data.stake_in),
        tokenIconUrl: notification.data.stake_in.image,
        tokenNetworkUrl: nativeTokenDetails?.image,
      },
      {
        type: 'ModalField-Asset',
        label: strings('notifications.modal.label_unstaking_confirmed'),
        description: notification.data.stake_out.symbol,
        amount: getTokenAmount(notification.data.stake_out),
        usdAmount: getTokenUSDAmount(notification.data.stake_out),
        tokenIconUrl: notification.data.stake_out.image,
        tokenNetworkUrl: nativeTokenDetails?.image,
      },
    ];

    return {
      title: modalTitle(notification),
      createdAt: notification.createdAt,
      fields: [
        {
          type: 'ModalField-Address',
          label: strings('notifications.modal.label_account'),
          address: notification.address,
        },
        ...(isStaked(notification) ? stakedAssetFields : unstakedAssetFields),
        {
          type: 'ModalField-Transaction',
          txHash: notification.tx_hash,
        },
        {
          type: 'ModalField-StakingProvider',
          stakingProvider: STAKING_PROVIDER_MAP[notification.type],
          tokenIconUrl: isStaked(notification)
            ? notification.data.stake_out.image
            : notification.data.stake_in.image,
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
