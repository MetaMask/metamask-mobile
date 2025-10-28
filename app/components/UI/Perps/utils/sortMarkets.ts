import type { PerpsMarketData } from '../controllers/types';
import { MARKET_SORTING_CONFIG } from '../constants/perpsConfig';
import { parseVolume } from '../hooks/usePerpsMarkets';

export type SortField =
  | 'volume'
  | 'priceChange'
  | 'fundingRate'
  | 'openInterest';
export type SortDirection = 'asc' | 'desc';

interface SortMarketsParams {
  markets: PerpsMarketData[];
  sortBy: SortField;
  direction?: SortDirection;
}

/**
 * Sorts markets based on the specified criteria
 * Uses object parameters pattern for maintainability
 */
export const sortMarkets = ({
  markets,
  sortBy,
  direction = MARKET_SORTING_CONFIG.DEFAULT_DIRECTION,
}: SortMarketsParams): PerpsMarketData[] => {
  const sortedMarkets = [...markets];

  sortedMarkets.sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case MARKET_SORTING_CONFIG.SORT_FIELDS.VOLUME: {
        // Parse volume strings with magnitude suffixes (e.g., '$1.2B', '$850M')
        const volumeA = parseVolume(a.volume);
        const volumeB = parseVolume(b.volume);
        compareValue = volumeA - volumeB;
        break;
      }

      case MARKET_SORTING_CONFIG.SORT_FIELDS.PRICE_CHANGE: {
        // Use 24h price change percentage (e.g., '+2.5%', '-1.8%')
        // Parse and remove % sign
        const changeA = parseFloat(
          a.change24hPercent?.replace(/[%+]/g, '') || '0',
        );
        const changeB = parseFloat(
          b.change24hPercent?.replace(/[%+]/g, '') || '0',
        );
        compareValue = changeA - changeB;
        break;
      }

      case MARKET_SORTING_CONFIG.SORT_FIELDS.FUNDING_RATE: {
        // Funding rate is a number (not string)
        const fundingA = a.fundingRate ?? 0;
        const fundingB = b.fundingRate ?? 0;
        compareValue = fundingA - fundingB;
        break;
      }

      case MARKET_SORTING_CONFIG.SORT_FIELDS.OPEN_INTEREST: {
        // Parse open interest strings (similar to volume)
        const openInterestA = parseVolume(a.openInterest);
        const openInterestB = parseVolume(b.openInterest);
        compareValue = openInterestA - openInterestB;
        break;
      }

      default:
        // Unsupported sort field - maintain current order (compareValue remains 0)
        break;
    }

    // Apply sort direction
    return direction === MARKET_SORTING_CONFIG.DEFAULT_DIRECTION
      ? compareValue * -1 // desc (larger first)
      : compareValue; // asc (smaller first)
  });

  return sortedMarkets;
};
