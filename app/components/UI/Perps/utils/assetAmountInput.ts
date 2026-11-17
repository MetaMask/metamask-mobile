import { BigNumber } from 'bignumber.js';

function isPlainDecimal(value: string): boolean {
  let sawDigit = false;
  let sawDot = false;

  for (const char of value) {
    if (char >= '0' && char <= '9') {
      sawDigit = true;
      continue;
    }
    if (char === '.' && !sawDot) {
      sawDot = true;
      continue;
    }
    return false;
  }

  return sawDigit;
}

function stripTrailingFractionZeros(value: string): string {
  let end = value.length;
  while (end > 0 && value.charAt(end - 1) === '0') {
    end -= 1;
  }
  const withoutZeros = value.slice(0, end);
  return withoutZeros.endsWith('.') ? withoutZeros.slice(0, -1) : withoutZeros;
}

function stripLeadingZeros(value: string): string {
  let index = 0;
  while (
    index < value.length &&
    value.charAt(index) === '0' &&
    index + 1 < value.length &&
    value.charAt(index + 1) >= '0' &&
    value.charAt(index + 1) <= '9'
  ) {
    index += 1;
  }
  return value.slice(index);
}

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

  const normalized = value.replaceAll(',', '').trim();
  if (!isPlainDecimal(normalized)) {
    return '0';
  }

  const withoutTrailingZeros = normalized.includes('.')
    ? stripTrailingFractionZeros(normalized)
    : normalized;
  const withoutLeadingZeros = stripLeadingZeros(withoutTrailingZeros);

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

/**
 * Coin size to commit from a typed keypad value.
 *
 * Truncates to the market size step and clamps to the open position. Reaching
 * the position size is a full close so the caller can omit an explicit size.
 *
 * @param assetAmount - In-progress coin amount, including a trailing decimal.
 * @param sizeDecimals - Maximum fractional digits for the asset.
 * @param maxAmount - Open position size in coin units.
 * @returns The clamped size, and whether it closes the whole position.
 */
export function resolveTypedCloseAssetAmount(
  assetAmount: string,
  sizeDecimals: number,
  maxAmount: number,
): { amount: string; isEntirePosition: boolean } {
  const normalized = assetAmount.endsWith('.')
    ? assetAmount.slice(0, -1)
    : assetAmount;
  const asset = new BigNumber(normalized);
  const max = new BigNumber(maxAmount);

  if (
    !asset.isFinite() ||
    asset.isNegative() ||
    asset.isZero() ||
    !max.isFinite() ||
    max.isLessThanOrEqualTo(0)
  ) {
    return { amount: '0', isEntirePosition: false };
  }

  if (asset.isGreaterThanOrEqualTo(max)) {
    return { amount: max.toFixed(), isEntirePosition: true };
  }

  const decimals =
    Number.isInteger(sizeDecimals) && sizeDecimals > 0 ? sizeDecimals : 0;
  const limited = asset.decimalPlaces(decimals, BigNumber.ROUND_DOWN);
  if (!limited.isFinite() || limited.isZero()) {
    return { amount: '0', isEntirePosition: false };
  }

  return { amount: limited.toFixed(), isEntirePosition: false };
}
