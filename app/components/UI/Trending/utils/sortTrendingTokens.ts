import type { TrendingAsset } from '@metamask/assets-controllers';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../components/TrendingTokensBottomSheet';
import { getPriceChangeFieldKey } from '../components/TrendingTokenRowItem/utils';

const getDataPredicate = (
  option: PriceChangeOption,
): ((t: TrendingAsset) => boolean) => {
  switch (option) {
    case PriceChangeOption.PriceChange:
      // Not using price change on purpose since price change can be 0%
      return (t) => Boolean(t.price && t.price !== '0');
    case PriceChangeOption.Volume:
      return (t) => Boolean(t.aggregatedUsdVolume);
    case PriceChangeOption.MarketCap:
      return (t) => Boolean(t.marketCap);
  }
};

const getValueExtractor = (
  option: PriceChangeOption,
  timeOption: TimeOption,
): ((t: TrendingAsset) => number) => {
  switch (option) {
    case PriceChangeOption.PriceChange: {
      const key = getPriceChangeFieldKey(timeOption);
      return (t) => {
        const v = t.priceChangePct?.[key];
        return v ? parseFloat(v) || 0 : 0;
      };
    }
    case PriceChangeOption.Volume:
      return (t) => t.aggregatedUsdVolume ?? 0;
    case PriceChangeOption.MarketCap:
      return (t) => t.marketCap ?? 0;
  }
};

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

  const hasData = getDataPredicate(option);
  const getValue = getValueExtractor(option, timeOption);
  const dirMultiplier = direction === SortDirection.Ascending ? 1 : -1;

  const sortable: TrendingAsset[] = [];
  const nulled: TrendingAsset[] = [];
  for (const token of tokens) {
    (hasData(token) ? sortable : nulled).push(token);
  }

  sortable.sort((a, b) => (getValue(a) - getValue(b)) * dirMultiplier);

  for (const token of nulled) {
    sortable.push(token);
  }

  return sortable;
};
