import { predictActivityKeys, predictActivityOptions } from './activity';
import { predictBalanceKeys, predictBalanceOptions } from './balance';
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
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
  prices: {
    keys: predictPricesKeys,
    options: predictPricesOptions,
  },
};
