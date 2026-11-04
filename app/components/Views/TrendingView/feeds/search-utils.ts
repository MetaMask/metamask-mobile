import type { FuseOptions } from 'fuse.js';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  TimeOption,
  PriceChangeOption,
} from '../../../UI/Trending/components/TrendingTokensBottomSheet';
import type { TrendingFilterContext } from '../../../UI/Trending/components/TrendingTokensList/TrendingTokensList';
import { BASE_FUSE_OPTIONS } from './fuseSearch';

export { fuseSearch } from './fuseSearch';

export const TOKEN_FUSE_OPTIONS: FuseOptions<TrendingAsset> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['symbol', 'name', 'assetId'],
};

export const PERPS_FUSE_OPTIONS: FuseOptions<PerpsMarketData> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['symbol', 'name'],
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
