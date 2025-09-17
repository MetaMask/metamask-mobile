import { IconName } from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import {
  PointsEventDto,
  SwapEventPayload,
  PerpsEventPayload,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { isNullOrUndefined } from '@metamask/utils';
import { formatUnits } from 'viem';
import { getTimeDifferenceFromNow } from '../../../../util/date';
import { getIntlNumberFormatter } from '../../../../util/intl';

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

export const formatTimeRemaining = (endDate: Date): string | null => {
  const { days, hours, minutes } = getTimeDifferenceFromNow(endDate.getTime());
  return hours <= 0
    ? minutes <= 0
      ? null
      : `${minutes}m`
    : `${days}d ${hours}h`;
};

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

const getPerpsEventTitle = (payload: PerpsEventPayload): string => {
  switch (payload.type) {
    case PerpsEventType.TAKE_PROFIT:
      return strings('rewards.events.type.take_profit');
    case PerpsEventType.CLOSE_POSITION:
      return strings('rewards.events.type.close_position');
    case PerpsEventType.STOP_LOSS:
      return strings('rewards.events.type.stop_loss');
    case PerpsEventType.OPEN_POSITION:
      return strings('rewards.events.type.open_position');
    default:
      return strings('rewards.events.type.uncategorized_event');
  }
};

const getPerpsEventDetails = (
  payload: PerpsEventPayload,
): string | undefined => {
  if (
    isNullOrUndefined(payload?.asset?.amount) ||
    isNullOrUndefined(payload?.asset?.decimals) ||
    isNullOrUndefined(payload?.asset?.symbol)
  )
    return undefined;

  const { amount, decimals, symbol } = payload.asset;
  const formattedAmount = formatUnits(BigInt(amount), decimals);

  switch (payload.type) {
    case PerpsEventType.OPEN_POSITION:
      if (isNullOrUndefined(payload.direction)) return undefined;
      return `${getPerpsEventDirection(
        payload.direction,
      )} ${formattedAmount} ${symbol}`;
    case PerpsEventType.CLOSE_POSITION:
    case PerpsEventType.TAKE_PROFIT:
    case PerpsEventType.STOP_LOSS:
      return `$${symbol} ${formattedAmount}`;
    default:
      return undefined;
  }
};

/**
 * Formats a swap event details
 * @param payload - The swap event payload
 * @returns The swap event details
 */
const getSwapEventDetails = (payload: SwapEventPayload): string | undefined => {
  if (
    isNullOrUndefined(payload.srcAsset?.amount) ||
    isNullOrUndefined(payload.srcAsset?.decimals) ||
    isNullOrUndefined(payload.srcAsset?.symbol)
  )
    return undefined;

  const { amount, decimals, symbol } = payload.srcAsset;
  const formattedAmount = formatUnits(BigInt(amount), decimals);

  return `${formattedAmount} ${symbol} to ${
    payload.destAsset?.symbol || 'Unknown'
  }`;
};

/**
 * Formats an event details
 * @param event - The event
 * @returns The event details
 */
export const getEventDetails = (
  event: PointsEventDto,
): {
  title: string;
  details: string | undefined;
  icon: IconName;
  badgeImageUri?: string;
} => {
  switch (event.type) {
    case 'SWAP':
      return {
        title: strings('rewards.events.type.swap'),
        details: getSwapEventDetails(event.payload as SwapEventPayload),
        icon: IconName.SwapVertical,
        badgeImageUri: (event.payload as SwapEventPayload).srcAsset.iconUrl,
      };
    case 'PERPS':
      return {
        title: getPerpsEventTitle(event.payload as PerpsEventPayload),
        details: getPerpsEventDetails(event.payload as PerpsEventPayload),
        icon: IconName.Candlestick,
        badgeImageUri: (event.payload as PerpsEventPayload).asset.iconUrl,
      };
    case 'REFERRAL':
      return {
        title: strings('rewards.events.type.referral_action'),
        details: undefined,
        icon: IconName.UserCircleAdd,
        badgeImageUri: undefined,
      };
    case 'SIGN_UP_BONUS':
      return {
        title: strings('rewards.events.type.sign_up_bonus'),
        details: undefined,
        icon: IconName.Edit,
        badgeImageUri: undefined,
      };
    case 'LOYALTY_BONUS':
      return {
        title: strings('rewards.events.type.loyalty_bonus'),
        details: undefined, // TODO: Missing data
        icon: IconName.ThumbUp,
        badgeImageUri: undefined,
      };
    case 'ONE_TIME_BONUS':
      return {
        title: strings('rewards.events.type.one_time_bonus'),
        details: undefined,
        icon: IconName.Gift,
        badgeImageUri: undefined,
      };
    default:
      return {
        title: strings('rewards.events.type.uncategorized_event'),
        details: undefined,
        icon: IconName.Star,
        badgeImageUri: undefined,
      };
  }
};

export const formatNumber = (value: number | null): string => {
  if (value === null || value === undefined) {
    return '0';
  }
  try {
    return getIntlNumberFormatter(I18n.locale).format(value);
  } catch (e) {
    return String(value);
  }
};

// Get icon name with fallback to Star if invalid
export const getIconName = (iconName: string): IconName =>
  Object.values(IconName).includes(iconName as IconName)
    ? (iconName as IconName)
    : IconName.Star;
