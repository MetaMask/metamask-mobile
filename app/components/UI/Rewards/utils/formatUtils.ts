import { IconName } from '@metamask/design-system-react-native';
import I18n from '../../../../../locales/i18n';
import { PointsEventDto } from '../../../../core/Engine/controllers/rewards-controller/types';

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

const getPerpsEventDetails = (event: PointsEventDto): string | undefined => {
  const { payload } = event;

  if (
    payload &&
    typeof payload === 'object' &&
    'token' in payload &&
    typeof payload.token === 'object' &&
    payload.token &&
    'symbol' in payload.token &&
    'decimals' in payload.token &&
    'amount' in payload.token &&
    'type' in payload
  ) {
    const { amount, decimals, symbol } = payload.token;
    switch (payload.type) {
      case PerpsEventType.OPEN_POSITION:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return `${getPerpsEventDirection((payload as any).direction)} ${
          (amount as number) / (decimals as number)
        } ${symbol}`;
      case PerpsEventType.CLOSE_POSITION:
      case PerpsEventType.TAKE_PROFIT:
      case PerpsEventType.STOP_LOSS:
        return `$${symbol} ${(amount as number) / (decimals as number)}`;
      default:
        return undefined;
    }
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
        title: 'Swap',
        details: '0.0 ETH to USDC',
        icon: IconName.SwapVertical,
      };
    case 'PERPS':
      return {
        title: 'Perps',
        details: getPerpsEventDetails(event),
        icon: IconName.Chart,
      };
    case 'REFERRAL':
      return {
        title: 'Referral action',
        details: undefined,
        icon: IconName.People,
      };
    case 'SIGN_UP_BONUS':
      return {
        title: 'Sign up bonus',
        details: undefined,
        icon: IconName.Edit,
      };
    case 'LOYALTY_BONUS':
      return {
        title: 'Loyalty bonus',
        details: undefined, // TODO: Missing data
        icon: IconName.ThumbUp,
      };
    case 'ONE_TIME_BONUS':
      return {
        title: 'One-time bonus',
        details: undefined,
        icon: IconName.Gift,
      };
    default:
      return {
        title: 'Uncategorized event',
        details: undefined,
        icon: IconName.Star,
      };
  }
};
