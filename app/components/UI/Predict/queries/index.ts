import { predictActivityKeys, predictActivityOptions } from './activity';
import { predictBalanceKeys, predictBalanceOptions } from './balance';
import {
  predictOrderPreviewKeys,
  predictOrderPreviewOptions,
} from './orderPreview';
import { predictPositionsKeys, predictPositionsOptions } from './positions';
import { predictPricesKeys, predictPricesOptions } from './prices';
import {
  predictUnrealizedPnLKeys,
  predictUnrealizedPnLOptions,
} from './unrealizedPnL';

export const predictQueries = {
  activity: {
    keys: predictActivityKeys,
    options: predictActivityOptions,
  },
  balance: {
    keys: predictBalanceKeys,
    options: predictBalanceOptions,
  },
  orderPreview: {
    keys: predictOrderPreviewKeys,
    options: predictOrderPreviewOptions,
  },
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
  prices: {
    keys: predictPricesKeys,
    options: predictPricesOptions,
  },
  unrealizedPnL: {
    keys: predictUnrealizedPnLKeys,
    options: predictUnrealizedPnLOptions,
  },
};
