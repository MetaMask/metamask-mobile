import BigNumber from 'bignumber.js';
import { formatWithThreshold } from '../../../../util/assets';
import { getLocaleLanguageCode } from '../../../hooks/useFormatters';

// One cent. Values strictly below this collapse to $0.00 — mUSD is USD-pegged
// so sub-cent fiat is economically meaningless.
const THRESHOLD = 0.01;

/**
 * Helper that wraps formatWithThreshold to centralize Money formatting logic.
 * Any value whose absolute amount is below one cent is collapsed to $0.00 so
 * that `<$0.01` is never shown in the Money domain.
 *
 * @param value - The fiat value to format.
 * @param currentCurrency - The user's selected currency to format the value in.
 * @returns The formatted fiat value.
 */
export const moneyFormatFiat = (
  value: BigNumber,
  currentCurrency: string,
): string => {
  const effective = value.abs().lt(THRESHOLD) ? new BigNumber(0) : value;
  return formatWithThreshold(
    effective.toNumber(),
    THRESHOLD,
    getLocaleLanguageCode(),
    {
      style: 'currency',
      currency: currentCurrency,
    },
  );
};
