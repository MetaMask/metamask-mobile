import BigNumber from 'bignumber.js';

/** Formats a decimal-string share count for display, trimming trailing zeros: "10.00" → "10". */
export const formatSharesAmount = (value: string): string =>
  new BigNumber(value).toString();

/** Formats an Order's contract count in hundredths, rounded down and without
 * trailing zeros: 12.5 → "12.5", "43.00" → "43", "12.500000001" → "12.5". */
export const formatContractCount = (value: BigNumber.Value): string =>
  new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_DOWN).toString();
