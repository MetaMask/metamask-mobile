import type BigNumber from 'bignumber.js';

export const isAccountFunded = (tokenTotal: BigNumber | undefined): boolean =>
  tokenTotal !== undefined && tokenTotal.gt(0);
