import BigNumber from 'bignumber.js';

/** Formats a non-negative decimal-string amount as USD, e.g. "1250.45" → "$1,250.45". */
export const formatUsdAmount = (value: string): string => {
  const amount = new BigNumber(value);
  return `$${amount.toFormat(2, BigNumber.ROUND_HALF_UP)}`;
};

/** Formats a signed decimal-string amount as USD with an explicit sign, e.g. "-1.25" → "-$1.25". */
export const formatSignedUsdAmount = (value: string): string => {
  const amount = new BigNumber(value);
  return amount.isNegative()
    ? `-$${amount.abs().toFormat(2, BigNumber.ROUND_HALF_UP)}`
    : `+$${amount.toFormat(2, BigNumber.ROUND_HALF_UP)}`;
};

/** Whether a decimal-string amount is non-zero, for omitting empty financial values. */
export const isNonZeroAmount = (value: string): boolean =>
  !new BigNumber(value).isZero();

/**
 * Formats Settlement proceeds: signed when won ("+$41.50"), plain when the
 * Market settled against the Position ("$0.00") so a loss is not colored as a win.
 */
export const formatSettlementProceeds = (value: string): string => {
  if (isNonZeroAmount(value)) {
    return formatSignedUsdAmount(value);
  }
  return formatUsdAmount(value);
};

/** Formats a decimal-string share count for display, trimming trailing zeros: "10.00" → "10". */
export const formatSharesAmount = (value: string): string =>
  new BigNumber(value).toString();

const timestampFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** Formats an ISO timestamp for an Activity row, e.g. "Mar 5, 2:45 PM". */
export const formatActivityTimestamp = (timestamp: string): string =>
  timestampFormat.format(new Date(timestamp));
