import {
  FIAT_INPUT_DECIMALS,
  SECONDARY_TOKEN_AMOUNT_DECIMALS,
  formatFiatInputAmount,
  formatSecondaryTokenAmount,
  formatTokenInputAmountFromFiat,
} from './sourceAmountInputMode';

describe('sourceAmountInputMode', () => {
  describe('formatFiatInputAmount', () => {
    it('converts token amount to fiat input amount', () => {
      expect(formatFiatInputAmount('0.025', 2000)).toBe('50');
    });

    it('returns undefined when rate is unavailable', () => {
      expect(formatFiatInputAmount('1', undefined)).toBeUndefined();
    });
  });

  describe('formatTokenInputAmountFromFiat', () => {
    it('converts fiat amount to token input amount', () => {
      expect(
        formatTokenInputAmountFromFiat({
          fiatAmount: '50',
          tokenFiatRate: 2000,
          tokenDecimals: 18,
        }),
      ).toBe('0.025');
    });

    it('rounds down to token decimals', () => {
      expect(
        formatTokenInputAmountFromFiat({
          fiatAmount: '1',
          tokenFiatRate: 3,
          tokenDecimals: 2,
        }),
      ).toBe('0.33');
    });

    it('returns undefined when token decimals are unavailable', () => {
      expect(
        formatTokenInputAmountFromFiat({
          fiatAmount: '50',
          tokenFiatRate: 2000,
          tokenDecimals: undefined,
        }),
      ).toBeUndefined();
    });
  });

  describe('formatSecondaryTokenAmount', () => {
    it('floors token amount to secondary display decimals', () => {
      expect(formatSecondaryTokenAmount('0.054266763023182519')).toBe(
        '0.05426',
      );
    });

    it('trims trailing zeros after flooring', () => {
      expect(formatSecondaryTokenAmount('1.230009')).toBe('1.23');
    });

    it('returns undefined for missing token amount', () => {
      expect(formatSecondaryTokenAmount(undefined)).toBeUndefined();
    });
  });

  it('uses two decimals for fiat input', () => {
    expect(FIAT_INPUT_DECIMALS).toBe(2);
  });

  it('uses five decimals for secondary token amounts', () => {
    expect(SECONDARY_TOKEN_AMOUNT_DECIMALS).toBe(5);
  });
});
