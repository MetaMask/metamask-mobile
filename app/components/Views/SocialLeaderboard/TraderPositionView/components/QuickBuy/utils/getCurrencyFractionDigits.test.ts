import {
  getCurrencyFractionDigits,
  roundFiatAmount,
} from './getCurrencyFractionDigits';

describe('getCurrencyFractionDigits', () => {
  it('returns 2 for standard two-decimal currencies', () => {
    expect(getCurrencyFractionDigits('USD')).toBe(2);
    expect(getCurrencyFractionDigits('EUR')).toBe(2);
  });

  it('is case-insensitive', () => {
    expect(getCurrencyFractionDigits('usd')).toBe(2);
    expect(getCurrencyFractionDigits('jpy')).toBe(0);
  });

  it('returns 0 for zero-decimal currencies', () => {
    expect(getCurrencyFractionDigits('JPY')).toBe(0);
    expect(getCurrencyFractionDigits('KRW')).toBe(0);
  });

  it('returns 3 for three-decimal currencies', () => {
    expect(getCurrencyFractionDigits('BHD')).toBe(3);
  });

  it('falls back to 2 for an empty or unknown currency code', () => {
    expect(getCurrencyFractionDigits('')).toBe(2);
    expect(getCurrencyFractionDigits('NOT_A_CURRENCY')).toBe(2);
  });
});

describe('roundFiatAmount', () => {
  it('rounds to two decimals for USD/EUR', () => {
    expect(roundFiatAmount(33.333, 'USD')).toBe('33.33');
    expect(roundFiatAmount(33.335, 'EUR')).toBe('33.34');
  });

  it('rounds to whole numbers for zero-decimal currencies', () => {
    expect(roundFiatAmount(33.5, 'JPY')).toBe('34');
    expect(roundFiatAmount(3299.4, 'KRW')).toBe('3299');
  });

  it('rounds to three decimals for BHD', () => {
    expect(roundFiatAmount(1.23456, 'BHD')).toBe('1.235');
  });
});
