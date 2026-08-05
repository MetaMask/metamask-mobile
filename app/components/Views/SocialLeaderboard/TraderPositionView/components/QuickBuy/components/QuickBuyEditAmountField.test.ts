import { getQuickBuyEditFieldErrorMessage } from './QuickBuyEditAmountField';

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string | number>) => {
    if (!params) {
      return key;
    }
    return `${key}:${JSON.stringify(params)}`;
  },
}));

jest.mock('../../../../../../UI/Bridge/utils/currencyUtils', () => ({
  formatCurrency: jest.fn(
    (amount: number, currency: string) => `${currency}:${amount}`,
  ),
  getCurrencySymbol: jest.fn((currency: string) => currency),
}));

describe('getQuickBuyEditFieldErrorMessage', () => {
  it('formats buy_below_max with the user currency', () => {
    const message = getQuickBuyEditFieldErrorMessage('buy_below_max', {
      currency: 'EUR',
      usdToCurrentCurrencyRate: 0.9,
    });

    expect(message).toContain(
      'social_leaderboard.quick_buy.edit_quick_amounts_buy_below_max',
    );
    expect(message).toContain('"max":"EUR:');
    expect(message).not.toContain('$');
  });

  it('formats buy_above_zero with the user currency', () => {
    const message = getQuickBuyEditFieldErrorMessage('buy_above_zero', {
      currency: 'JPY',
      usdToCurrentCurrencyRate: 150,
    });

    expect(message).toBe(
      'social_leaderboard.quick_buy.edit_quick_amounts_buy_above_zero:{"min":"JPY:0"}',
    );
  });
});
