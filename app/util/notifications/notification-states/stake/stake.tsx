import { strings } from '../../../../../locales/i18n';
import { TRIGGER_TYPES } from '../../constants';
import { ExtractedNotification, isOfTypeNodeGuard } from '../node-guard';
import { NotificationState } from '../types/NotificationState';
import { getAmount, getNotificationBadge } from '../../notification.util';

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

const descriptionStart = (n: StakeNotification) => {
  const direction = DIRECTION_MAP[n.type];
  return direction === 'staked'
    ? n.data.stake_in.symbol
    : n.data.stake_out.symbol;
};

const descriptionEnd = (n: StakeNotification) => {
  const direction = DIRECTION_MAP[n.type];
  const token = direction === 'staked' ? n.data.stake_in : n.data.stake_out;
  const amount = getAmount(token.amount, token.decimals, {
    shouldEllipse: true,
  });
  const symbol = token.symbol;

  return `${amount} ${symbol}`;
};

const imageUrl = (n: StakeNotification) => {
  const direction = DIRECTION_MAP[n.type];
  const token = direction === 'staked' ? n.data.stake_in : n.data.stake_out;
  return token.image;
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
};

export default state;
