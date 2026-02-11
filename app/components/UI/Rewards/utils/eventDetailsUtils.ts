import { IconName } from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import {
  PointsEventDto,
  SwapEventPayload,
  PerpsEventPayload,
  CardEventPayload,
  MusdDepositEventPayload,
  EventAssetDto,
  SeasonActivityTypeDto,
} from '../../../../core/Engine/controllers/rewards-controller/types';
import { isNullOrUndefined } from '@metamask/utils';
import { formatUnits } from 'viem';
import { formatWithThreshold } from '../../../../util/assets';
import { PerpsEventType } from './eventConstants';
import {
  formatRewardsMusdDepositPayloadDate,
  getIconName,
  resolveTemplate,
} from './formatUtils';

/**
 * Formats an asset amount with proper decimals
 * - Very small amounts (< 0.00001) show as "<0.00001"
 * - Large amounts (>= 1M) use compact notation (e.g., "1M", "10M")
 * - Normal amounts use standard locale formatting
 */
export const formatAssetAmount = (amount: string, decimals: number): string => {
  const oneHundredThousandths = 0.00001;
  const oneMillion = 1_000_000;
  const rawAmount = formatUnits(BigInt(amount), decimals);
  const numericAmount = parseFloat(rawAmount);

  // Check if the number is a whole number (no significant decimals)
  const isWholeNumber = numericAmount === Math.floor(numericAmount);

  // Use compact notation for large numbers (>= 1M)
  if (numericAmount >= oneMillion) {
    return formatWithThreshold(
      numericAmount,
      oneHundredThousandths,
      I18n.locale,
      {
        notation: 'compact',
        maximumFractionDigits: 2,
      },
    );
  }

  return formatWithThreshold(
    numericAmount,
    oneHundredThousandths,
    I18n.locale,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: isWholeNumber ? 0 : 5,
    },
  );
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
  const formattedAmount = formatAssetAmount(amount, decimals);

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
 * Gets the details for card events
 * @param payload - The card event payload
 * @returns The card event details
 */
export const getCardEventDetails = (
  payload: CardEventPayload,
): string | undefined => {
  const asset = payload?.asset;

  if (!hasValidAsset(asset)) return undefined;

  const formattedAmount = formatAssetAmount(asset.amount, asset.decimals);
  return `${formattedAmount} ${asset.symbol}`;
};

/**
 * Resolved event details with optional title override.
 */
export interface ResolvedEventDetails {
  /** Optional title override. When provided, takes precedence over the activity type title. */
  title?: string;
  /** The resolved details string. */
  details: string | undefined;
}

/**
 * Resolves event details based on the activity type and event payload.
 * Each event type has its own logic for computing the title and details.
 * @param type - The activity type (e.g., 'SWAP', 'PERPS', 'CARD', etc.)
 * @param payload - The event payload
 * @param accountName - Optional account name for bonus events
 * @returns Resolved details for known types, or null if the type is not
 * recognized (caller should use fallback)
 */
export const resolveEventDetails = (
  type: string,
  payload: PointsEventDto['payload'],
  accountName?: string,
): ResolvedEventDetails | null => {
  switch (type) {
    case 'SWAP':
      return {
        details: payload
          ? formatSwapDetails(payload as SwapEventPayload)
          : undefined,
      };
    case 'PERPS':
      return {
        title: payload
          ? getPerpsEventTitle(payload as PerpsEventPayload)
          : undefined,
        details: payload
          ? getPerpsEventDetails(payload as PerpsEventPayload)
          : undefined,
      };
    case 'CARD':
      return {
        details: payload
          ? getCardEventDetails(payload as CardEventPayload)
          : undefined,
      };
    case 'SIGN_UP_BONUS':
    case 'LOYALTY_BONUS':
      return { details: accountName };
    case 'MUSD_DEPOSIT': {
      const formattedDate = formatRewardsMusdDepositPayloadDate(
        (payload as MusdDepositEventPayload | null)?.date,
      );
      return {
        details: formattedDate
          ? strings('rewards.events.musd_deposit_for', {
              date: formattedDate,
            })
          : undefined,
      };
    }
    case 'REFERRAL':
    case 'APPLY_REFERRAL_BONUS':
    case 'ONE_TIME_BONUS':
    case 'PREDICT':
      return { details: undefined };
    default:
      return null;
  }
};

/**
 * Formats an event details
 * @param event - The event
 * @param activityTypes - The activity types
 * @param accountName - Optional account name to display for bonus events
 * @returns The event details
 */
export const getEventDetails = (
  event: PointsEventDto,
  activityTypes: SeasonActivityTypeDto[],
  accountName: string | undefined,
): {
  title: string;
  details: string | undefined;
  icon: IconName;
} => {
  const matchingActivityType = activityTypes.find(
    (activity) => activity.type === event.type,
  );

  if (matchingActivityType) {
    const resolved = resolveEventDetails(
      matchingActivityType.type,
      event.payload,
      accountName,
    );

    if (resolved) {
      return {
        title: resolved.title ?? matchingActivityType.title,
        details: resolved.details,
        icon: getIconName(matchingActivityType.icon),
      };
    }

    // For unknown types, fall back to description template resolution
    return {
      title: matchingActivityType.title,
      details: resolveTemplate(
        (
          matchingActivityType as SeasonActivityTypeDto & {
            description: string;
          }
        ).description ?? '',
        (event.payload ?? {}) as Record<string, string>,
      ),
      icon: getIconName(matchingActivityType.icon),
    };
  }

  return {
    title: strings('rewards.events.type.uncategorized_event'),
    details: undefined,
    icon: IconName.Star,
  };
};
