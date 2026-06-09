import type BigNumber from 'bignumber.js';

export const isAccountFunded = (fiatTotal): boolean =>
  fiatTotal !== undefined && new BigNumber(fiatTotal).gt(0);
