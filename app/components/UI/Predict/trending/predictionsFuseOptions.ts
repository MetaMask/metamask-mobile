import type { FuseOptions } from 'fuse.js';
import type { PredictMarket as PredictMarketType } from '../types';
import { BASE_FUSE_OPTIONS } from '../../../Views/TrendingView/feeds/search-utils';

export const PREDICTIONS_FUSE_OPTIONS: FuseOptions<PredictMarketType> = {
  ...BASE_FUSE_OPTIONS,
  keys: ['title', 'description'],
};
