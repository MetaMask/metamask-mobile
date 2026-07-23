export const QUICK_BUY_EDIT_AMOUNT_COUNT = 4 as const;

export const BUY_AMOUNT_MIN_EXCLUSIVE = 0;
export const BUY_AMOUNT_MAX_EXCLUSIVE = 10_000;

export const SELL_PERCENT_MIN_EXCLUSIVE = 0;
export const SELL_PERCENT_MAX = 100;

export type QuickBuyEditFieldKind = 'buy' | 'sell';

export type QuickBuyEditFieldError =
  | 'buy_above_zero'
  | 'buy_below_max'
  | 'sell_above_zero'
  | 'sell_below_max';

export function validateQuickBuyEditField(
  kind: QuickBuyEditFieldKind,
  value: number,
): QuickBuyEditFieldError | null {
  if (!Number.isFinite(value)) {
    return kind === 'buy' ? 'buy_above_zero' : 'sell_above_zero';
  }

  if (kind === 'buy') {
    if (value <= BUY_AMOUNT_MIN_EXCLUSIVE) {
      return 'buy_above_zero';
    }
    if (value >= BUY_AMOUNT_MAX_EXCLUSIVE) {
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
): {
  buyErrors: (QuickBuyEditFieldError | null)[];
  sellErrors: (QuickBuyEditFieldError | null)[];
  isValid: boolean;
} {
  const buyErrors = buyAmounts.map((amount) =>
    validateQuickBuyEditField('buy', amount),
  );
  const sellErrors = sellPercentages.map((percent) =>
    validateQuickBuyEditField('sell', percent),
  );

  return {
    buyErrors,
    sellErrors,
    isValid:
      buyErrors.every((error) => error === null) &&
      sellErrors.every((error) => error === null),
  };
}
