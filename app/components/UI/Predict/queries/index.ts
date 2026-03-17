import { predictActivityKeys, predictActivityOptions } from './activity';
import { predictBalanceKeys, predictBalanceOptions } from './balance';
import { predictPositionsKeys, predictPositionsOptions } from './positions';
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
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
  unrealizedPnL: {
    keys: predictUnrealizedPnLKeys,
    options: predictUnrealizedPnLOptions,
  },
};
