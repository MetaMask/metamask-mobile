import { BigNumber } from 'bignumber.js';

const NUMERIC_AMOUNT = /^\d*\.?\d*$/;

/**
 * USD value of a user-typed asset amount.
 *
 * Keeps the product's full precision. Rounding to cents makes one cheap coin
 * convert back into a different size (1 PEOPLE at ~$0.008 becomes $0.01,
 * which is no longer 1 PEOPLE).
 *
 * @param assetAmount - Asset amount as typed, including a trailing decimal.
 * @param price - USD price of one asset unit.
 * @returns USD amount string, or `'0'` when the input cannot be priced.
 */
export function convertAssetAmountToUsd(
  assetAmount: string,
  price: number,
): string {
  const normalized = assetAmount.endsWith('.')
    ? assetAmount.slice(0, -1)
    : assetAmount;

  if (normalized === '' || !Number.isFinite(price) || price <= 0) {
    return '0';
  }

  const asset = new BigNumber(normalized);
  if (!asset.isFinite() || asset.isNegative()) {
    return '0';
  }

  const usd = asset.times(price);
  if (!usd.isFinite() || usd.isNegative() || usd.isZero()) {
    return '0';
  }

  return usd.toFixed();
}

/**
 * Asset amount safe to hand to the keypad. Display strings can include
 * grouping separators or trailing zeros that must not become part of the
 * next keypress.
 *
 * @param value - Derived or formatted asset amount.
 * @returns A plain numeric string, or `'0'` when `value` is not numeric.
 */
export function toKeypadAssetAmount(value: string | undefined): string {
  if (!value) {
    return '0';
  }

  const normalized = value.replace(/,/g, '').trim();
  if (
    !NUMERIC_AMOUNT.test(normalized) ||
    normalized === '' ||
    normalized === '.'
  ) {
    return '0';
  }

  const withoutTrailingZeros = normalized.includes('.')
    ? normalized.replace(/0+$/, '').replace(/\.$/, '')
    : normalized;
  const withoutLeadingZeros = withoutTrailingZeros.replace(/^0+(?=\d)/, '');

  if (
    withoutLeadingZeros === '' ||
    withoutLeadingZeros === '.' ||
    withoutLeadingZeros === '0.'
  ) {
    return '0';
  }

  return withoutLeadingZeros;
}

/**
 * Caps the fractional part of an asset amount at the market's size decimals.
 * A trailing decimal point is preserved so the user can keep typing after it.
 *
 * @param value - In-progress asset amount.
 * @param sizeDecimals - Maximum fractional digits for the asset.
 * @returns The amount limited to `sizeDecimals`.
 */
export function limitAssetAmountDecimals(
  value: string,
  sizeDecimals: number,
): string {
  const decimals =
    Number.isInteger(sizeDecimals) && sizeDecimals > 0 ? sizeDecimals : 0;

  if (!value.includes('.')) {
    return value;
  }

  const [integerPart, decimalPart = ''] = value.split('.');
  const whole = integerPart || '0';
  if (decimals === 0) {
    return whole;
  }

  if (decimalPart.length === 0) {
    return `${whole}.`;
  }

  return `${whole}.${decimalPart.slice(0, decimals)}`;
}
