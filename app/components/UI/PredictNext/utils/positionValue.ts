import BigNumber from 'bignumber.js';
import { strings } from '../../../../../locales/i18n';

/** Formats a non-negative decimal-string amount as USD, e.g. "1250.45" → "$1,250.45". */
export const formatUsdAmount = (value: string): string => {
  const amount = new BigNumber(value);
  return `$${amount.toFormat(2, BigNumber.ROUND_HALF_UP)}`;
};

/** Formats a signed decimal-string amount as USD with an explicit sign, e.g.
 * "-1.25" → "-$1.25". A value that rounds to zero is unsigned: "$0.00". */
export const formatSignedUsdAmount = (value: string): string => {
  const amount = new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_HALF_UP);
  if (amount.isZero()) {
    return '$0.00';
  }
  return amount.isNegative()
    ? `-$${amount.abs().toFormat(2)}`
    : `+$${amount.toFormat(2)}`;
};

/** Formats a signed percent-unit decimal string, e.g. "-24.05" → "-24.05%".
 * A value that rounds to zero is unsigned: "0.00%". */
export const formatSignedPercent = (value: string): string => {
  const percent = new BigNumber(value).decimalPlaces(
    2,
    BigNumber.ROUND_HALF_UP,
  );
  if (percent.isZero()) {
    return '0.00%';
  }
  return `${percent.isNegative() ? '-' : '+'}${percent.abs().toFixed(2)}%`;
};

/** Text tone for a signed PnL amount: neutral when it rounds to zero. */
export const pnlToneClassName = (value: string): string => {
  const amount = new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_HALF_UP);
  if (amount.isZero()) {
    return 'text-alternative';
  }
  return amount.isNegative() ? 'text-error-default' : 'text-success-default';
};

/** The signed unrealized PnL, with its percent when the backend sent one,
 * e.g. "+$1.00 (+1.90%)". */
export const formatPositionPnl = (
  unrealizedPnl: string,
  unrealizedPnlPercent?: string,
): string => {
  const amount = formatSignedUsdAmount(unrealizedPnl);
  return unrealizedPnlPercent === undefined
    ? amount
    : strings('predict_next.portfolio.pnl_with_percent', {
        amount,
        percent: formatSignedPercent(unrealizedPnlPercent),
      });
};
