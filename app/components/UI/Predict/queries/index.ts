import { predictActivityKeys, predictActivityOptions } from './activity';
import { predictBalanceKeys, predictBalanceOptions } from './balance';
import { predictMarketsKeys } from './markets';
import { predictPositionsKeys, predictPositionsOptions } from './positions';
import { predictPricesKeys, predictPricesOptions } from './prices';

export const predictQueries = {
  activity: {
    keys: predictActivityKeys,
    options: predictActivityOptions,
  },
  balance: {
    keys: predictBalanceKeys,
    options: predictBalanceOptions,
  },
  markets: {
    keys: predictMarketsKeys,
  },
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
  prices: {
    keys: predictPricesKeys,
    options: predictPricesOptions,
  },
};
