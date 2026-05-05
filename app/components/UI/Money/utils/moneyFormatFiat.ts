import { formatWithThreshold } from '../../../../util/assets';
import { getLocaleLanguageCode } from '../../../hooks/useFormatters';

const THRESHOLD = 0.01;

/**
 *
 * Helper that wraps formatWithThreshold to centralize Money formatting logic.
 *
 * @param value - The fiat value to format.
 * @param currentCurrency - The user's selected currency to format the value in.
 * @returns The formatted fiat value.
 */
export const moneyFormatFiat = (
  value: BigNumber,
  currentCurrency: string,
): string =>
  formatWithThreshold(value.toNumber(), THRESHOLD, getLocaleLanguageCode(), {
    style: 'currency',
    currency: currentCurrency,
  });
