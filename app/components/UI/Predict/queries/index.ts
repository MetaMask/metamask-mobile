import { predictActivityKeys, predictActivityOptions } from './activity';
import { predictBalanceKeys, predictBalanceOptions } from './balance';
import { predictPositionsKeys, predictPositionsOptions } from './positions';
import {
  predictPriceHistoryKeys,
  predictPriceHistoryOptions,
} from './priceHistory';

export const predictQueries = {
  activity: {
    keys: predictActivityKeys,
    options: predictActivityOptions,
  },
  balance: {
    keys: predictBalanceKeys,
    options: predictBalanceOptions,
  },
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
  priceHistory: {
    keys: predictPriceHistoryKeys,
    options: predictPriceHistoryOptions,
  },
};
