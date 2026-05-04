import Fuse, { type FuseOptions } from 'fuse.js';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import {
  TimeOption,
  PriceChangeOption,
} from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../../UI/Trending/components/TrendingTokensList/TrendingTokensList';

const BASE_FUSE_OPTIONS = {
  shouldSort: true,
  threshold: 0.2,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
} as const;

export const TOKEN_FUSE_OPTIONS: FuseOptions<TrendingAsset> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['symbol', 'name', 'assetId'],
};

export const PERPS_FUSE_OPTIONS: FuseOptions<PerpsMarketData> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['symbol', 'name'],
};

export const PREDICTIONS_FUSE_OPTIONS: FuseOptions<PredictMarketType> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['title', 'description'],
};

export const fuseSearch = <T>(
  data: T[],
  searchQuery: string | undefined,
  fuseOptions: FuseOptions<T>,
  searchSortingFn?: (a: T, b: T) => number,
): T[] => {
  const trimmed = searchQuery?.trim();
  if (!trimmed) return data;
  const fuse = new Fuse(data, fuseOptions);
  const results = fuse.search(trimmed);
  return searchSortingFn ? results.sort(searchSortingFn) : results;
};

export const DEFAULT_TOKENS_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.PriceChange,
  networkFilter: 'all',
  isSearchResult: false,
};

export const SEARCH_TOKENS_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.PriceChange,
  networkFilter: 'all',
  isSearchResult: true,
};

export const CRYPTO_MOVERS_SEARCH_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.Volume,
  networkFilter: 'all',
  isSearchResult: true,
};

export const CRYPTO_MOVERS_HOME_FILTER_CONTEXT: TrendingFilterContext = {
  timeFilter: TimeOption.TwentyFourHours,
  sortOption: PriceChangeOption.Volume,
  networkFilter: 'all',
  isSearchResult: false,
};
