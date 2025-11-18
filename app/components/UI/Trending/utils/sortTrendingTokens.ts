import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  PriceChangeOption,
  SortDirection,
} from '../components/TrendingTokensBottomSheet';

/**
 * Sorts trending tokens based on the selected option and direction
 * @param tokens - Array of trending tokens to sort
 * @param option - The sorting option (PriceChange, Volume, MarketCap)
 * @param direction - The sort direction (Ascending or Descending)
 * @returns Sorted array of tokens
 */
export const sortTrendingTokens = (
  tokens: TrendingAsset[],
  option: PriceChangeOption = PriceChangeOption.PriceChange,
  direction: SortDirection = SortDirection.Descending,
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
      case PriceChangeOption.PriceChange:
        // For price change, use priceChangePct?.h24 for 24-hour price change percentage
        aValue = a.priceChangePct?.h24
          ? parseFloat(a.priceChangePct.h24) || 0
          : 0;
        bValue = b.priceChangePct?.h24
          ? parseFloat(b.priceChangePct.h24) || 0
          : 0;
        break;
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
