import { BigNumber } from 'bignumber.js';
import {
  FIAT_INPUT_DECIMALS,
  SECONDARY_TOKEN_AMOUNT_DECIMALS,
} from '../sourceAmountInputMode';
import { LIMIT_ORDER_QUICK_PRICE_SIGNIFICANT_DIGITS } from './formatLimitOrderQuickPrice';

/**
 * Significant digits a displayed limit price keeps for a cheap quoted token
 * (e.g. PEPE), where its regular decimal places (cents for fiat, five for the
 * secondary counter token amount) would round Market and every percent preset
 * to the same price, or to zero.
 */
export const LIMIT_ORDER_PRICE_SIGNIFICANT_DIGITS = 4;

/**
 * Decimal places a unit price needs to keep `significantDigits` significant
 * digits of the market price, and never fewer than `minDecimals`.
 *
 * Derived from the market price rather than the price itself, so that Market,
 * every percent preset and anything typed into the input share one precision.
 *
 * @param options - The market price, the minimum decimals and the significant
 * digits to keep.
 * @returns The decimal places, or `minDecimals` when the market price is not
 * usable.
 */
export const getLimitOrderPriceDecimals = ({
  marketPrice,
  minDecimals,
  significantDigits,
}: {
  marketPrice: BigNumber.Value | undefined;
  minDecimals: number;
  significantDigits: number;
}): number => {
  const market = new BigNumber(marketPrice ?? NaN);
  if (!market.isFinite() || market.lte(0) || market.e === null) {
    return minDecimals;
  }

  // `e` is the exponent of the leading digit, e.g. -6 for 0.0000042, which
  // needs 9 decimal places to keep 4 significant digits.
  return Math.max(minDecimals, significantDigits - 1 - market.e);
};

/**
 * Decimal places a fiat limit price is shown, typed and rounded with.
 *
 * Cents, like every other fiat value, unless the quoted token trades below one
 * unit of the display currency, which keeps
 * {@link LIMIT_ORDER_PRICE_SIGNIFICANT_DIGITS} significant digits instead.
 *
 * @param marketFiat - Live fiat price of 1 unit of the quoted token.
 * @returns The decimal places.
 */
export const getLimitOrderFiatPriceDecimals = (
  marketFiat: BigNumber.Value | undefined,
): number => {
  if (marketFiat === undefined || new BigNumber(marketFiat).gte(1)) {
    return FIAT_INPUT_DECIMALS;
  }

  return getLimitOrderPriceDecimals({
    marketPrice: marketFiat,
    minDecimals: FIAT_INPUT_DECIMALS,
    significantDigits: LIMIT_ORDER_PRICE_SIGNIFICANT_DIGITS,
  });
};

const getMarketCounterPrice = (
  marketFiat: number | undefined,
  counterFiatRate: number | undefined,
): BigNumber | undefined =>
  marketFiat && counterFiatRate
    ? new BigNumber(marketFiat).dividedBy(counterFiatRate)
    : undefined;

/**
 * Decimal places a limit price in counter token units is shown, typed and
 * rounded with.
 *
 * A unit price is a rate, not an amount of the counter token, so it is not
 * bound by the token's decimals: a quoted token worth a fraction of the
 * counter token's smallest unit (e.g. PEPE priced in 6-decimal mUSD) still
 * keeps {@link LIMIT_ORDER_QUICK_PRICE_SIGNIFICANT_DIGITS} significant digits.
 * That is more than a fiat price keeps, because this price is compared with
 * the unrounded market rate, and Market has to read as 0.00% from it.
 *
 * @param options - The live fiat rates of both tokens and the counter token's
 * decimals.
 * @returns The decimal places, or undefined when the counter token's decimals
 * are unknown.
 */
export const getLimitOrderTokenPriceDecimals = ({
  counterFiatRate,
  counterTokenDecimals,
  marketFiat,
}: {
  counterFiatRate: number | undefined;
  counterTokenDecimals: number | undefined;
  marketFiat: number | undefined;
}): number | undefined => {
  if (counterTokenDecimals === undefined) {
    return undefined;
  }

  return getLimitOrderPriceDecimals({
    marketPrice: getMarketCounterPrice(marketFiat, counterFiatRate),
    minDecimals: counterTokenDecimals,
    significantDigits: LIMIT_ORDER_QUICK_PRICE_SIGNIFICANT_DIGITS,
  });
};

/**
 * Decimal places of the secondary "≈" counter token amount shown under a fiat
 * limit price: five, or more for a quoted token worth a tiny fraction of the
 * counter token.
 *
 * @param options - The live fiat rates of both tokens.
 * @returns The decimal places.
 */
export const getLimitOrderSecondaryTokenPriceDecimals = ({
  counterFiatRate,
  marketFiat,
}: {
  counterFiatRate: number | undefined;
  marketFiat: number | undefined;
}): number =>
  getLimitOrderPriceDecimals({
    marketPrice: getMarketCounterPrice(marketFiat, counterFiatRate),
    minDecimals: SECONDARY_TOKEN_AMOUNT_DECIMALS,
    significantDigits: LIMIT_ORDER_PRICE_SIGNIFICANT_DIGITS,
  });
