import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
} from '../api/recurringOrders.mock';
import { MOCK_RECURRING_OPEN_ORDER_SWAPS } from '../api/recurringSwaps.mock';
import {
  formatRecurringExecutionPrice,
  formatRecurringInterval,
  formatRecurringOrderDate,
  formatRecurringPriceRange,
  formatRecurringTokenAmount,
  getRecurringOrderFilledPercent,
  getRecurringOrderTokens,
  getUsdToCurrentCurrencyRate,
  isRecurringSwapEligibleForAddFunds,
} from './recurringOrders';

describe('recurring order formatting', () => {
  it('converts V2 native and ERC-20 assets to Bridge tokens', () => {
    const result = getRecurringOrderTokens(MOCK_RECURRING_OPEN_ORDER);

    expect(result.sourceToken).toMatchObject({
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x1',
      symbol: 'ETH',
      image:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
    });
    expect(result.destinationToken).toMatchObject({
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
      symbol: 'USDC',
    });
  });

  it('formats atomic token amounts with asset decimals', () => {
    const result = formatRecurringTokenAmount('1500000000000000', 18);

    expect(result).toBe('0.0015');
  });

  it.each([
    { every: 1, expected: '1 day' },
    { every: 2, expected: '2 days' },
  ])('formats an interval occurring $every times', ({ every, expected }) => {
    const result = formatRecurringInterval({
      every,
      unit: 'day',
      repeatCount: 5,
    });

    expect(result).toBe(expected);
  });

  it('calculates filled percentage from aggregate counts', () => {
    const result = getRecurringOrderFilledPercent(MOCK_RECURRING_OPEN_ORDER);

    expect(result).toBe(40);
  });

  it('formats an unfilled order as zero percent', () => {
    const result = getRecurringOrderFilledPercent(MOCK_RECURRING_OPEN_ORDER_2);

    expect(result).toBe(0);
  });

  it('omits average execution price from an unfilled fixture', () => {
    const result = MOCK_RECURRING_OPEN_ORDER_2.averageExecutionPriceUsd;

    expect(result).toBeUndefined();
  });

  it('returns zero percent when repeat count is zero', () => {
    const result = getRecurringOrderFilledPercent({
      ...MOCK_RECURRING_OPEN_ORDER,
      schedule: {
        ...MOCK_RECURRING_OPEN_ORDER.schedule,
        repeatCount: 0,
      },
    });

    expect(result).toBe(0);
  });

  it('formats API timestamps with the current locale', () => {
    const result = formatRecurringOrderDate('2026-09-01T12:00:00.000Z');

    expect(result).toBe('Sep 1, 2026');
  });

  it('converts USD values to the current currency rate', () => {
    const result = getUsdToCurrentCurrencyRate({
      currentCurrency: 'EUR',
      conversionRate: 1800,
      usdConversionRate: 2000,
    });

    expect(result).toBe(0.9);
  });

  it('formats a historical USD price range in the current currency', () => {
    const result = formatRecurringPriceRange({
      priceRange: MOCK_RECURRING_OPEN_ORDER.priceRange,
      currentCurrency: 'EUR',
      usdToCurrentCurrencyRate: 0.9,
    });

    expect(result).toContain('€1,620.00');
    expect(result).toContain('€1,980.00');
  });

  it('preserves a one-sided historical price range during conversion', () => {
    const result = formatRecurringPriceRange({
      priceRange: {
        tokenSide: 'dest',
        currency: 'USD',
        min: '1800',
      },
      currentCurrency: 'EUR',
      usdToCurrentCurrencyRate: 0.9,
    });

    expect(result).toBe('≥ €1,620.00');
  });

  it('returns the missing placeholder when the currency rate is unavailable', () => {
    const result = formatRecurringPriceRange({
      priceRange: MOCK_RECURRING_OPEN_ORDER.priceRange,
      currentCurrency: 'EUR',
    });

    expect(result).toBe('--');
  });

  it('formats average execution price in the current currency', () => {
    const result = formatRecurringExecutionPrice({
      priceUsd: '2000',
      currentCurrency: 'EUR',
      usdToCurrentCurrencyRate: 0.9,
    });

    expect(result).toBe('€1,800.00');
  });
});

describe('isRecurringSwapEligibleForAddFunds', () => {
  const insufficientBalanceSwap = MOCK_RECURRING_OPEN_ORDER_SWAPS[2];
  const unrelatedSkippedSwap = MOCK_RECURRING_OPEN_ORDER_SWAPS[3];
  const filledSwap = MOCK_RECURRING_OPEN_ORDER_SWAPS[0];

  it('returns true when an insufficient-balance skip has no newer filled swap', () => {
    expect(
      isRecurringSwapEligibleForAddFunds(insufficientBalanceSwap, [
        unrelatedSkippedSwap,
        insufficientBalanceSwap,
        filledSwap,
      ]),
    ).toBe(true);
  });

  it('returns false when a filled swap occurred after the skip', () => {
    expect(
      isRecurringSwapEligibleForAddFunds(insufficientBalanceSwap, [
        filledSwap,
        insufficientBalanceSwap,
      ]),
    ).toBe(false);
  });

  it('returns false for another skip reason', () => {
    expect(
      isRecurringSwapEligibleForAddFunds(unrelatedSkippedSwap, [
        unrelatedSkippedSwap,
      ]),
    ).toBe(false);
  });

  it('returns false when the swap is absent from the loaded history', () => {
    expect(
      isRecurringSwapEligibleForAddFunds(insufficientBalanceSwap, [filledSwap]),
    ).toBe(false);
  });
});
