import {
  formatLimitOrderFiatUnitPrice,
  formatLimitOrderFiatValue,
} from './formatLimitOrderFiatValue';

describe('formatLimitOrderFiatValue', () => {
  it('formats a value with exactly two decimal places', () => {
    expect(formatLimitOrderFiatValue(2200.5, 'usd')).toBe('$2,200.50');
  });

  it('rounds a value with more than two decimal places', () => {
    expect(formatLimitOrderFiatValue('2200.456789', 'usd')).toBe('$2,200.46');
  });

  it('formats zero', () => {
    expect(formatLimitOrderFiatValue(0, 'usd')).toBe('$0.00');
  });

  it('shows a positive value below one cent as less than one cent', () => {
    expect(formatLimitOrderFiatValue(0.004, 'usd')).toBe('<$0.01');
  });

  it('keeps two decimal places for currencies that use fewer by default', () => {
    expect(formatLimitOrderFiatValue(1500, 'jpy')).toBe('¥1,500.00');
  });

  describe('with more maximum fraction digits', () => {
    it('shows a sub-cent unit price up to the given decimal places', () => {
      expect(formatLimitOrderFiatValue('0.000003799', 'usd', 9)).toBe(
        '$0.000003799',
      );
    });

    it('keeps at least two decimal places', () => {
      expect(formatLimitOrderFiatValue('0.5', 'usd', 4)).toBe('$0.50');
    });

    it('shows a positive value below the smallest decimal place as less than it', () => {
      expect(formatLimitOrderFiatValue('0.00000000001', 'usd', 9)).toBe(
        '<$0.000000001',
      );
    });

    it('never shows fewer than two decimal places', () => {
      expect(formatLimitOrderFiatValue(2200.5, 'usd', 0)).toBe('$2,200.50');
    });
  });
});

describe('formatLimitOrderFiatUnitPrice', () => {
  it('condenses the leading zeros of a tiny unit price', () => {
    expect(formatLimitOrderFiatUnitPrice('0.000003799', 'usd', 9)).toBe(
      '$0.0₅3799',
    );
  });

  it('rounds to the given decimal places before condensing', () => {
    expect(formatLimitOrderFiatUnitPrice('0.0000042126', 'usd', 9)).toBe(
      '$0.0₅4213',
    );
  });

  it('places the currency code after a condensed price when the currency has no symbol', () => {
    expect(formatLimitOrderFiatUnitPrice('0.000003799', 'xyz', 9)).toBe(
      '0.0₅3799 xyz',
    );
  });

  it('formats a unit price with fewer than four leading zeros as a fiat value', () => {
    expect(formatLimitOrderFiatUnitPrice('0.003799', 'usd', 6)).toBe(
      formatLimitOrderFiatValue('0.003799', 'usd', 6),
    );
  });

  it('formats a price of cents as a fiat value', () => {
    expect(formatLimitOrderFiatUnitPrice('2200.5', 'usd', 2)).toBe('$2,200.50');
  });
});
