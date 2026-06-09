import BigNumber from 'bignumber.js';

export const isAccountFunded = (fiatTotal: BigNumber | undefined): boolean =>
  fiatTotal !== undefined && new BigNumber(fiatTotal).gt(0);
