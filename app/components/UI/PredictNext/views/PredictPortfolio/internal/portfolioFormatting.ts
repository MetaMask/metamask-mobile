import BigNumber from 'bignumber.js';
import {
  formatSignedUsdAmount,
  formatUsdAmount,
} from '../../../utils/positionValue';

export { formatSharesAmount } from '../../../utils/formatShares';
export {
  formatSignedPercent,
  formatSignedUsdAmount,
  formatUsdAmount,
  pnlToneClassName,
} from '../../../utils/positionValue';

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

const timestampFormat = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/** Formats an ISO timestamp as a calendar date, e.g. "Aug 27, 2026". */
export const formatActivityDate = (timestamp: string): string =>
  dateFormat.format(new Date(timestamp));

/** Formats an ISO timestamp for an Activity row, e.g. "Mar 5, 2:45 PM". */
export const formatActivityTimestamp = (timestamp: string): string =>
  timestampFormat.format(new Date(timestamp));
