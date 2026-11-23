import { BigNumber } from 'bignumber.js';
import { trimTrailingZeros } from '../trimTrailingZeros';
import { FIAT_INPUT_DECIMALS } from '../sourceAmountInputMode';

/**
 * Fiat unit prices for limit orders can be well below $0.01. Rounding them to
 * two decimal places (currency cents) makes "Market" diverge from the quoted
 * token's fiat rate by several percent. This precision is therefore only for
 * internal use, i.e. market comparisons and the USD price an order is placed
 * at. Anything shown to or typed by the user goes through
 * {@link formatLimitOrderFiatInputPrice} instead.
 *
 * A price in counter token units is kept at this precision too: it is a rate,
 * not an amount of the counter token, so it is not bound by the token's
 * decimals.
 */
export const LIMIT_ORDER_PRICE_DECIMALS = 18;
const LIMIT_ORDER_FIAT_PRICE_SIGNIFICANT_DIGITS = 8;

/**
 * Significant digits a fiat limit price shown to the user keeps for a quoted
 * token worth less than one unit of the display currency (e.g. PEPE), where
 * cents would round Market and every percent preset to the same price, or to
 * zero.
 */
const LIMIT_ORDER_FIAT_INPUT_SIGNIFICANT_DIGITS = 4;

/**
 * Decimal places a fiat limit price is shown, typed and rounded with: cents,
 * like every other fiat value, unless the price is below one unit of the
 * display currency, which keeps
 * {@link LIMIT_ORDER_FIAT_INPUT_SIGNIFICANT_DIGITS} significant digits instead.
 *
 * @param price - Fiat price of 1 unit of the quoted token. Pass the live
 * market price so that Market, every percent preset and anything typed into
 * the input share one precision.
 * @returns The decimal places.
 */
export const getLimitOrderFiatPriceDecimals = (
  price: BigNumber.Value | undefined,
): number => {
  const value = new BigNumber(price ?? NaN);
  if (!value.isFinite() || value.lte(0) || value.gte(1) || value.e === null) {
    return FIAT_INPUT_DECIMALS;
  }

  // `e` is the exponent of the leading digit, e.g. -6 for 0.0000042, which
  // needs 9 decimal places to keep 4 significant digits.
  return LIMIT_ORDER_FIAT_INPUT_SIGNIFICANT_DIGITS - 1 - value.e;
};

/**
 * Formats a quoted-token unit price in fiat for the limit-price input.
 *
 * Keeps enough significant digits that a market snapshot compares as 0.00%
 * from the live fiat rate, instead of rounding cheap tokens to cents.
 *
 * @param fiatAmount - Positive fiat amount for 1 unit of the quoted token.
 * @returns Trimmed fiat string, or undefined when the amount is not usable.
 */
export const formatLimitOrderFiatPrice = (
  fiatAmount: BigNumber.Value | undefined,
): string | undefined => {
  if (fiatAmount === undefined || fiatAmount === '') {
    return undefined;
  }

  const value = new BigNumber(fiatAmount);
  if (!value.isFinite() || value.lte(0)) {
    return undefined;
  }

  const rounded = value
    .precision(LIMIT_ORDER_FIAT_PRICE_SIGNIFICANT_DIGITS)
    .decimalPlaces(LIMIT_ORDER_PRICE_DECIMALS);
  if (rounded.lte(0)) {
    return undefined;
  }

  return trimTrailingZeros(rounded.toFixed());
};

/**
 * Formats a quoted-token unit price in fiat for display in the limit-price
 * input, which shows two decimal places like every other fiat value, unless
 * the quoted token is cheap enough to need more (see
 * {@link getLimitOrderFiatPriceDecimals}).
 *
 * @param fiatAmount - Positive fiat amount for 1 unit of the quoted token.
 * @param decimals - Decimal places to round to.
 * @returns Trimmed fiat string, or undefined when the amount is not usable or
 * is too small to survive rounding to `decimals` places.
 */
export const formatLimitOrderFiatInputPrice = (
  fiatAmount: BigNumber.Value | undefined,
  decimals: number = FIAT_INPUT_DECIMALS,
): string | undefined => {
  if (fiatAmount === undefined || fiatAmount === '') {
    return undefined;
  }

  const value = new BigNumber(fiatAmount);
  if (!value.isFinite() || value.lte(0)) {
    return undefined;
  }

  const rounded = value.decimalPlaces(decimals);
  if (rounded.lte(0)) {
    return undefined;
  }

  return trimTrailingZeros(rounded.toFixed());
};

/**
 * Converts a counter-token unit amount into a high-precision fiat unit price.
 *
 * @param tokenAmount - Amount of the counter token equal to 1 quoted token.
 * @param tokenFiatRate - Fiat rate of the counter token.
 * @returns Trimmed fiat string, or undefined when conversion inputs are missing.
 */
export const formatLimitOrderFiatPriceFromTokenAmount = (
  tokenAmount: string | undefined,
  tokenFiatRate: number | undefined,
): string | undefined => {
  if (!tokenAmount || !tokenFiatRate) {
    return undefined;
  }

  return formatLimitOrderFiatPrice(
    new BigNumber(tokenAmount).multipliedBy(tokenFiatRate),
  );
};

/**
 * Rounds a live market price to the decimal places a fiat limit price is shown
 * with, so the limit price is compared with the market price as the user sees
 * it. A market price too small to survive rounding is returned as is.
 *
 * @param marketFiat - Live fiat price of 1 unit of the quoted token.
 * @param decimals - Decimal places the limit price is shown with.
 * @returns The market price rounded to `decimals` places.
 */
export const roundLimitOrderMarketFiatToInput = (
  marketFiat: number | undefined,
  decimals: number,
): number | undefined => {
  const rounded = formatLimitOrderFiatInputPrice(marketFiat, decimals);

  return rounded === undefined ? marketFiat : Number(rounded);
};

/**
 * Same as {@link formatLimitOrderFiatPriceFromTokenAmount}, but rounded to the
 * decimal places the limit-price input shows.
 *
 * @param tokenAmount - Amount of the counter token equal to 1 quoted token.
 * @param tokenFiatRate - Fiat rate of the counter token.
 * @param decimals - Decimal places to round to.
 * @returns Trimmed fiat string, or undefined when conversion inputs are missing.
 */
export const formatLimitOrderFiatInputPriceFromTokenAmount = (
  tokenAmount: string | undefined,
  tokenFiatRate: number | undefined,
  decimals: number = FIAT_INPUT_DECIMALS,
): string | undefined => {
  if (!tokenAmount || !tokenFiatRate) {
    return undefined;
  }

  return formatLimitOrderFiatInputPrice(
    new BigNumber(tokenAmount).multipliedBy(tokenFiatRate),
    decimals,
  );
};
