import { IconName } from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import { PointsEventDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { isNullOrUndefined } from '@metamask/utils';

/**
 * Formats a timestamp for rewards date
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string with time
 * @example 'Jan 24 2:30 PM'
 */
export const formatRewardsDate = (
  timestamp: number,
  locale: string = I18n.locale,
): string =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));

export const PerpsEventType = {
  OPEN_POSITION: 'OPEN_POSITION',
  CLOSE_POSITION: 'CLOSE_POSITION',
  TAKE_PROFIT: 'TAKE_PROFIT',
  STOP_LOSS: 'STOP_LOSS',
} as const;

export type PerpsEventType =
  (typeof PerpsEventType)[keyof typeof PerpsEventType];

const getPerpsEventDirection = (direction: string) => {
  switch (direction) {
    case 'LONG':
      return 'Long';
    case 'SHORT':
      return 'Short';
  }
};

const getPerpsEventTitle = (event: PointsEventDto): string => {
  const { payload } = event;

  switch (payload?.type) {
    case PerpsEventType.TAKE_PROFIT:
      return strings('rewards.events.take_profit');
    case PerpsEventType.CLOSE_POSITION:
      return strings('rewards.events.close_position');
    case PerpsEventType.STOP_LOSS:
      return strings('rewards.events.stop_loss');
    case PerpsEventType.OPEN_POSITION:
      return strings('rewards.events.open_position');
    default:
      return strings('rewards.events.uncategorized_event');
  }
};

const getPerpsEventDetails = (event: PointsEventDto): string | undefined => {
  const { payload } = event;

  if (
    isNullOrUndefined(payload?.token?.amount) ||
    isNullOrUndefined(payload?.token?.decimals) ||
    isNullOrUndefined(payload?.token?.symbol)
  )
    return undefined;

  const { amount, decimals, symbol } = payload.token;

  switch (payload.type) {
    case PerpsEventType.OPEN_POSITION:
      if (isNullOrUndefined(payload.direction)) return undefined;
      return `${getPerpsEventDirection(payload.direction)} ${
        (amount as number) / (decimals as number)
      } ${symbol}`;
    case PerpsEventType.CLOSE_POSITION:
    case PerpsEventType.TAKE_PROFIT:
    case PerpsEventType.STOP_LOSS:
      return `$${symbol} ${(amount as number) / (decimals as number)}`;
    default:
      return undefined;
  }
};

export const getEventDetails = (
  event: PointsEventDto,
): {
  title: string;
  details: string | undefined;
  icon: IconName;
} => {
  switch (event.type) {
    case 'SWAP':
      return {
        title: strings('rewards.events.swap'),
        details: '0.0 ETH to USDC',
        icon: IconName.SwapVertical,
      };
    case 'PERPS':
      return {
        title: getPerpsEventTitle(event),
        details: getPerpsEventDetails(event),
        icon: IconName.Candlestick,
      };
    case 'REFERRAL':
      return {
        title: 'Referral action',
        details: undefined,
        icon: IconName.People,
      };
    case 'SIGN_UP_BONUS':
      return {
        title: strings('rewards.events.sign_up_bonus'),
        details: undefined,
        icon: IconName.Edit,
      };
    case 'LOYALTY_BONUS':
      return {
        title: strings('rewards.events.loyalty_bonus'),
        details: undefined, // TODO: Missing data
        icon: IconName.ThumbUp,
      };
    case 'ONE_TIME_BONUS':
      return {
        title: strings('rewards.events.one_time_bonus'),
        details: undefined,
        icon: IconName.Gift,
      };
    default:
      return {
        title: strings('rewards.events.uncategorized_event'),
        details: undefined,
        icon: IconName.Star,
      };
  }
};
