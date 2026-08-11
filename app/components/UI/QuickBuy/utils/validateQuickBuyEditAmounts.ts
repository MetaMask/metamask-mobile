import { snapToNiceFiatAmount } from './quickBuyQuickAmounts';

export const QUICK_BUY_EDIT_AMOUNT_COUNT = 4 as const;

export const BUY_AMOUNT_MIN_EXCLUSIVE = 0;
/** Max valid buy preset in USD — other currencies scale via conversion rate. */
export const BUY_AMOUNT_MAX_VALID_USD = 9_999_999;

export const SELL_PERCENT_MIN_EXCLUSIVE = 0;
export const SELL_PERCENT_MAX = 100;

export type QuickBuyEditFieldKind = 'buy' | 'sell';

export type QuickBuyEditFieldError =
  | 'buy_above_zero'
  | 'buy_below_max'
  | 'sell_above_zero'
  | 'sell_below_max';

export interface QuickBuyEditValidationContext {
  currency: string;
  usdToCurrentCurrencyRate: number | undefined;
}

export function getBuyAmountMaxValid(
  currency: string,
  usdToCurrentCurrencyRate: number | undefined,
): number {
  const normalizedCurrency = currency.toUpperCase();
  const rate =
    usdToCurrentCurrencyRate !== undefined &&
    Number.isFinite(usdToCurrentCurrencyRate) &&
    usdToCurrentCurrencyRate > 0
      ? usdToCurrentCurrencyRate
      : 1;

  if (normalizedCurrency === 'USD') {
    return BUY_AMOUNT_MAX_VALID_USD;
  }

  return snapToNiceFiatAmount(
    BUY_AMOUNT_MAX_VALID_USD * rate,
    normalizedCurrency,
  );
}

export function validateQuickBuyEditField(
  kind: QuickBuyEditFieldKind,
  value: number,
  validationContext?: QuickBuyEditValidationContext,
): QuickBuyEditFieldError | null {
  if (!Number.isFinite(value)) {
    return kind === 'buy' ? 'buy_above_zero' : 'sell_above_zero';
  }

  if (kind === 'buy') {
    if (value <= BUY_AMOUNT_MIN_EXCLUSIVE) {
      return 'buy_above_zero';
    }

    const maxValid = validationContext
      ? getBuyAmountMaxValid(
          validationContext.currency,
          validationContext.usdToCurrentCurrencyRate,
        )
      : BUY_AMOUNT_MAX_VALID_USD;

    if (value > maxValid) {
      return 'buy_below_max';
    }
    return null;
  }

  if (value <= SELL_PERCENT_MIN_EXCLUSIVE) {
    return 'sell_above_zero';
  }
  if (value > SELL_PERCENT_MAX) {
    return 'sell_below_max';
  }
  return null;
}

export function validateQuickBuyEditAmounts(
  buyAmounts: readonly number[],
  sellPercentages: readonly number[],
  validationContext?: QuickBuyEditValidationContext,
): {
  buyErrors: (QuickBuyEditFieldError | null)[];
  sellErrors: (QuickBuyEditFieldError | null)[];
  isValid: boolean;
} {
  const buyErrors = buyAmounts.map((amount) =>
    validateQuickBuyEditField('buy', amount, validationContext),
  );
  const sellErrors = sellPercentages.map((percent) =>
    validateQuickBuyEditField('sell', percent, validationContext),
  );

  return {
    buyErrors,
    sellErrors,
    isValid:
      buyErrors.every((error) => error === null) &&
      sellErrors.every((error) => error === null),
  };
}
