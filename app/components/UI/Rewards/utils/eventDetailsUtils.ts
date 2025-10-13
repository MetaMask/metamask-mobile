import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  PointsEventDto,
  SwapEventPayload,
  PerpsEventPayload,
  EventAssetDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { isNullOrUndefined } from '@metamask/utils';
import { formatUnits } from 'viem';
import { formatNumber } from './formatUtils';
import { PerpsEventType } from './eventConstants';

/**
 * Formats an asset amount with proper decimals
 */
export const formatAssetAmount = (amount: string, decimals: number): string => {
  const rawAmount = formatUnits(BigInt(amount), decimals);
  return formatNumber(parseFloat(Number(rawAmount).toFixed(3)));
};

/**
 * Validates if an asset has all required properties
 */
export const hasValidAsset = (asset: EventAssetDto | undefined): boolean =>
  !isNullOrUndefined(asset?.amount) &&
  !isNullOrUndefined(asset?.decimals) &&
  !isNullOrUndefined(asset?.symbol);

/**
 * Gets the direction text for perps events
 */
export const getPerpsEventDirection = (direction: string) => {
  switch (direction) {
    case 'LONG':
      return strings('perps.market.long');
    case 'SHORT':
      return strings('perps.market.short');
  }
};

/**
 * Gets the title for perps events based on type
 */
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

/**
 * Gets the details for perps events
 */
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
  const rawAmount = formatUnits(BigInt(amount), decimals);
  // Limit to at most 2 decimal places without padding zeros
  const formattedAmount = formatNumber(
    parseFloat(Number(rawAmount).toFixed(5)),
    decimals,
  );

  switch (payload.type) {
    case PerpsEventType.OPEN_POSITION:
      if (isNullOrUndefined(payload.direction)) return undefined;
      return `${getPerpsEventDirection(
        payload.direction,
      )} ${formattedAmount} ${symbol}`;
    case PerpsEventType.CLOSE_POSITION:
    case PerpsEventType.TAKE_PROFIT:
    case PerpsEventType.STOP_LOSS:
      return `${formattedAmount} ${symbol}`;
    default:
      return undefined;
  }
};

/**
 * Formats swap event details
 * @param payload - The swap event payload
 * @param includeDestAmount - Whether to include destination asset amount and symbol
 * @returns The swap event details
 */
export const formatSwapDetails = (
  payload: SwapEventPayload,
  includeDestAmount: boolean = false,
): string | undefined => {
  if (!hasValidAsset(payload.srcAsset)) return undefined;

  const { amount, decimals, symbol } = payload.srcAsset;
  const formattedAmount = formatAssetAmount(amount, decimals);
  const destSymbol = payload.destAsset?.symbol;

  if (
    includeDestAmount &&
    hasValidAsset(payload.destAsset) &&
    destSymbol &&
    payload.destAsset
  ) {
    const formattedDestAmount = formatAssetAmount(
      payload.destAsset.amount,
      payload.destAsset.decimals,
    );
    return `${formattedAmount} ${symbol} ${strings(
      'rewards.events.to',
    )} ${formattedDestAmount} ${destSymbol}`;
  }

  return `${formattedAmount} ${symbol}${
    destSymbol ? ` ${strings('rewards.events.to')} ${destSymbol}` : ''
  }`;
};

/**
 * Formats an event details
 * @param event - The event
 * @param accountName - Optional account name to display for bonus events
 * @returns The event details
 */
export const getEventDetails = (
  event: PointsEventDto,
  accountName: string | undefined,
): {
  title: string;
  details: string | undefined;
  icon: IconName;
} => {
  switch (event.type) {
    case 'SWAP':
      return {
        title: strings('rewards.events.type.swap'),
        details: formatSwapDetails(event.payload as SwapEventPayload),
        icon: IconName.SwapVertical,
      };
    case 'PERPS':
      return {
        title: getPerpsEventTitle(event.payload as PerpsEventPayload),
        details: getPerpsEventDetails(event.payload as PerpsEventPayload),
        icon: IconName.Candlestick,
      };
    case 'REFERRAL':
      return {
        title: strings('rewards.events.type.referral_action'),
        details: undefined,
        icon: IconName.UserCircleAdd,
      };
    case 'SIGN_UP_BONUS':
      return {
        title: strings('rewards.events.type.sign_up_bonus'),
        details: accountName,
        icon: IconName.Edit,
      };
    case 'LOYALTY_BONUS':
      return {
        title: strings('rewards.events.type.loyalty_bonus'),
        details: accountName,
        icon: IconName.ThumbUp,
      };
    case 'ONE_TIME_BONUS':
      return {
        title: strings('rewards.events.type.one_time_bonus'),
        details: undefined,
        icon: IconName.Gift,
      };
    default:
      return {
        title: strings('rewards.events.type.uncategorized_event'),
        details: undefined,
        icon: IconName.Star,
      };
  }
};
