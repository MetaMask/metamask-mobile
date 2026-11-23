import BigNumber from 'bignumber.js';

/** Formats a decimal-string share count for display, trimming trailing zeros: "10.00" → "10". */
export const formatSharesAmount = (value: string): string =>
  new BigNumber(value).toString();
