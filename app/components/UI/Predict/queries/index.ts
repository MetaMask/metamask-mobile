import {
  predictAccountStateKeys,
  predictAccountStateOptions,
} from './accountState';
import { predictActivityKeys, predictActivityOptions } from './activity';
import { predictBalanceKeys, predictBalanceOptions } from './balance';
import { predictPositionsKeys, predictPositionsOptions } from './positions';

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
  positions: {
    keys: predictPositionsKeys,
    options: predictPositionsOptions,
  },
};
