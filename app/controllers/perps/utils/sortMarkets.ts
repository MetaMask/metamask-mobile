import type { PerpsMarketData } from '../types';
import {
  MARKET_SORTING_CONFIG,
  PERPS_CONSTANTS,
} from '../constants/perpsConfig';

export type SortField =
  | 'volume'
  | 'priceChange'
  | 'fundingRate'
  | 'openInterest';
export type SortDirection = 'asc' | 'desc';

export type SortMarketsParams = {
  markets: PerpsMarketData[];
  sortBy: SortField;
  direction?: SortDirection;
};

const VOLUME_SUFFIX_REGEX = /\$?([\d.,]+)([KMBT])?/;

const multipliers: Record<string, number> = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
} as const;

const removeCommas = (str: string): string => {
  let result = '';
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char !== ',') result += char;
  }
  return result;
};

/**
 * Parse a formatted volume string (e.g., "$1.5M", "$2.3B") to a numeric value.
 * Extracted from hooks/usePerpsMarkets.ts for portability.
 */
export const parseVolume = (volumeStr: string | undefined): number => {
  if (!volumeStr) return -1;

  if (volumeStr === PERPS_CONSTANTS.FallbackPriceDisplay) return -1;
  if (volumeStr === '$<1') return 0.5;

  const suffixMatch = VOLUME_SUFFIX_REGEX.exec(volumeStr);
  if (suffixMatch) {
    const [, numberPart, suffix] = suffixMatch;
    const baseValue = Number.parseFloat(removeCommas(numberPart));

    if (Number.isNaN(baseValue)) return -1;

    return suffix ? baseValue * multipliers[suffix] : baseValue;
  }

  // Fallback: try to parse as plain number
  const cleaned = volumeStr.replace(/[$,]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? -1 : parsed;
};

/**
 * Sorts markets based on the specified criteria.
 */
export const sortMarkets = ({
  markets,
  sortBy,
  direction = MARKET_SORTING_CONFIG.DefaultDirection,
}: SortMarketsParams): PerpsMarketData[] => {
  const sortedMarkets = [...markets];

  sortedMarkets.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case MARKET_SORTING_CONFIG.SortFields.Volume: {
        const volumeA = parseVolume(a.volume);
        const volumeB = parseVolume(b.volume);
        compareValue = volumeA - volumeB;
        break;
      }

      case MARKET_SORTING_CONFIG.SortFields.PriceChange: {
        const changeA = parseFloat(
          a.change24hPercent?.replace(/[%+]/g, '') || '0',
        );
        const changeB = parseFloat(
          b.change24hPercent?.replace(/[%+]/g, '') || '0',
        );
        compareValue = changeA - changeB;
        break;
      }

      case MARKET_SORTING_CONFIG.SortFields.FundingRate: {
        const fundingA = a.fundingRate ?? 0;
        const fundingB = b.fundingRate ?? 0;
        compareValue = fundingA - fundingB;
        break;
      }

      case MARKET_SORTING_CONFIG.SortFields.OpenInterest: {
        const openInterestA = parseVolume(a.openInterest);
        const openInterestB = parseVolume(b.openInterest);
        compareValue = openInterestA - openInterestB;
        break;
      }

      default:
        break;
    }

    return direction === MARKET_SORTING_CONFIG.DefaultDirection
      ? compareValue * -1
      : compareValue;
  });

  return sortedMarkets;
};
