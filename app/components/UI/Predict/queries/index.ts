import { predictBalanceKeys, predictBalanceOptions } from './balance';
import { predictPositionsKeys, predictPositionsOptions } from './positions';

export const predictQueries = {
  balance: {
    keys: predictBalanceKeys,
    options: predictBalanceOptions,
  },
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
};
