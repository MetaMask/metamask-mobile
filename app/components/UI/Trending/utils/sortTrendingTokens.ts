import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../components/TrendingTokensBottomSheet';
import { getPriceChangeFieldKey } from '../components/TrendingTokenRowItem/TrendingTokenRowItem';

/**
 * Sorts trending tokens based on the selected option and direction
 * @param tokens - Array of trending tokens to sort
 * @param option - The sorting option (PriceChange, Volume, MarketCap)
 * @param direction - The sort direction (Ascending or Descending)
 * @param timeOption - The time period option (24h, 6h, 1h, 5m) - only used for PriceChange sorting
 * @returns Sorted array of tokens
 */
export const sortTrendingTokens = (
  tokens: TrendingAsset[],
  option: PriceChangeOption = PriceChangeOption.PriceChange,
  direction: SortDirection = SortDirection.Descending,
  timeOption: TimeOption = TimeOption.TwentyFourHours,
): TrendingAsset[] => {
  if (tokens.length === 0) {
    return [];
  }

  // Create a new array and sort in-place for better performance
  const sorted = [...tokens];
  sorted.sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (option) {
      case PriceChangeOption.PriceChange: {
        // For price change, use the priceChangePct field corresponding to the selected time option
        const priceChangeFieldKey = getPriceChangeFieldKey(timeOption);
        const aPriceChange = a.priceChangePct?.[priceChangeFieldKey];
        aValue = aPriceChange ? parseFloat(aPriceChange) || 0 : 0;
        const bPriceChange = b.priceChangePct?.[priceChangeFieldKey];
        bValue = bPriceChange ? parseFloat(bPriceChange) || 0 : 0;
        break;
      }
      case PriceChangeOption.Volume:
        aValue = a.aggregatedUsdVolume ?? 0;
        bValue = b.aggregatedUsdVolume ?? 0;
        break;
      case PriceChangeOption.MarketCap:
        aValue = a.marketCap ?? 0;
        bValue = b.marketCap ?? 0;
        break;
      default:
        return 0;
    }

    const comparison = aValue - bValue;
    return direction === SortDirection.Ascending ? comparison : -comparison;
  });

  return sorted;
};
