import AppConstants from '../core/AppConstants';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';

type GAS_OPTIONS = (typeof AppConstants)['GAS_OPTIONS'];

export type GAS_TIME_OPTIONS =
  (typeof AppConstants)['GAS_TIMES'][keyof (typeof AppConstants)['GAS_TIMES']];

export type GAS_ESTIMATE_TYPES_OPTIONS =
  (typeof GAS_ESTIMATE_TYPES)[keyof typeof GAS_ESTIMATE_TYPES];

export type AVAILABLE_GAS_OPTIONS = Omit<
  GAS_OPTIONS,
  'MARKET' | 'AGGRESSIVE'
>[keyof Omit<GAS_OPTIONS, 'MARKET' | 'AGGRESSIVE'>];
