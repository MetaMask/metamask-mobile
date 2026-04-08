import {
  predictAccountStateKeys,
  predictAccountStateOptions,
} from './accountState';
import { predictActivityKeys, predictActivityOptions } from './activity';
import { predictBalanceKeys, predictBalanceOptions } from './balance';
import {
  predictFeaturedCarouselKeys,
  predictFeaturedCarouselOptions,
} from './featuredCarousel';
import { predictMarketKeys, predictMarketOptions } from './market';
import {
  predictOrderPreviewKeys,
  predictOrderPreviewOptions,
} from './orderPreview';
import { predictPositionsKeys, predictPositionsOptions } from './positions';
import {
  predictPriceHistoryKeys,
  predictPriceHistoryOptions,
} from './priceHistory';
import { predictSeriesKeys, predictSeriesOptions } from './series';
import {
  predictUnrealizedPnLKeys,
  predictUnrealizedPnLOptions,
} from './unrealizedPnL';

export const predictQueries = {
  accountState: {
    keys: predictAccountStateKeys,
    options: predictAccountStateOptions,
  },
  activity: {
    keys: predictActivityKeys,
    options: predictActivityOptions,
  },
  balance: {
    keys: predictBalanceKeys,
    options: predictBalanceOptions,
  },
  featuredCarousel: {
    keys: predictFeaturedCarouselKeys,
    options: predictFeaturedCarouselOptions,
  },
  market: {
    keys: predictMarketKeys,
    options: predictMarketOptions,
  },
  orderPreview: {
    keys: predictOrderPreviewKeys,
    options: predictOrderPreviewOptions,
  },
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
  priceHistory: {
    keys: predictPriceHistoryKeys,
    options: predictPriceHistoryOptions,
  },
  series: {
    keys: predictSeriesKeys,
    options: predictSeriesOptions,
  },
  unrealizedPnL: {
    keys: predictUnrealizedPnLKeys,
    options: predictUnrealizedPnLOptions,
  },
};
