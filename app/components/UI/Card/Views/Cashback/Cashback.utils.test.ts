import {
  formatAmount,
  formatCurrency,
  getCashbackWithdrawalAmounts,
  roundFeeUp,
  floorToDisplayPrecision,
} from './Cashback.utils';

describe('Cashback.utils', () => {
  describe('formatCurrency', () => {
    it('maps known currencies', () => {
      expect(formatCurrency('musd')).toBe('mUSD');
      expect(formatCurrency('usdc')).toBe('USDC');
    });

    it('uppercases unknown currencies', () => {
      expect(formatCurrency('dai')).toBe('DAI');
    });
  });

  describe('formatAmount', () => {
    it('truncates to 4 decimal places', () => {
      expect(formatAmount(10.123456)).toBe('10.1234');
    });

    it('returns 0.00 for NaN', () => {
      expect(formatAmount('invalid')).toBe('0.00');
    });
  });

  describe('roundFeeUp', () => {
    it('rounds fee up to display precision', () => {
      expect(roundFeeUp(0.50001)).toBe(0.5001);
    });

    it('returns 0 for zero or negative fees', () => {
      expect(roundFeeUp(0)).toBe(0);
      expect(roundFeeUp(-1)).toBe(0);
    });

    it('leaves exact 4dp fees unchanged', () => {
      expect(roundFeeUp(0.5)).toBe(0.5);
    });
  });

  describe('floorToDisplayPrecision', () => {
    it('floors net amounts to display precision', () => {
      expect(floorToDisplayPrecision(9.50009)).toBe(9.5);
    });

    it('returns 0 for zero or negative values', () => {
      expect(floorToDisplayPrecision(0)).toBe(0);
      expect(floorToDisplayPrecision(-1)).toBe(0);
    });
  });

  describe('getCashbackWithdrawalAmounts', () => {
    it('computes net amount as balance minus fee rounded up', () => {
      const result = getCashbackWithdrawalAmounts('10.00', '0.50');

      expect(result.roundedFeeNum).toBe(0.5);
      expect(result.roundedFee).toBe('0.5');
      expect(result.netAmountNumber).toBe(9.5);
      expect(result.netAmount).toBe('9.5');
    });

    it('rounds fee up before subtracting from balance', () => {
      const result = getCashbackWithdrawalAmounts('10.00', '0.50001');

      expect(result.roundedFeeNum).toBe(0.5001);
      expect(result.netAmountNumber).toBe(9.4999);
      expect(result.netAmount).toBe('9.4999');
    });

    it('clamps net amount at zero when fee exceeds balance', () => {
      const result = getCashbackWithdrawalAmounts('0.50', '1.00');

      expect(result.netAmountNumber).toBe(0);
      expect(result.netAmount).toBe('0');
    });

    it('handles zero fee', () => {
      const result = getCashbackWithdrawalAmounts('10.00', '0');

      expect(result.roundedFeeNum).toBe(0);
      expect(result.netAmount).toBe('10');
      expect(result.netAmountNumber).toBe(10);
    });

    it('handles invalid inputs', () => {
      const result = getCashbackWithdrawalAmounts('invalid', 'invalid');

      expect(result.roundedFeeNum).toBe(0);
      expect(result.netAmountNumber).toBe(0);
      expect(result.netAmount).toBe('0');
    });

    it('uses the same net value for display and API submission', () => {
      const result = getCashbackWithdrawalAmounts('10.50', '0.50001');

      expect(formatAmount(result.netAmountNumber)).toBe(
        formatAmount(result.netAmount),
      );
    });

    it('marks insufficient when net floors to zero despite positive remainder', () => {
      const result = getCashbackWithdrawalAmounts('0.50005', '0.5');

      expect(result.netAmountNumber).toBe(0);
      expect(result.netAmount).toBe('0');
      expect(result.hasInsufficientBalance).toBe(true);
    });

    it('marks insufficient when fee exceeds balance', () => {
      const result = getCashbackWithdrawalAmounts('0.50', '1.00');

      expect(result.hasInsufficientBalance).toBe(true);
    });

    it('marks sufficient when net is above display precision', () => {
      const result = getCashbackWithdrawalAmounts('10.00', '0.50');

      expect(result.hasInsufficientBalance).toBe(false);
    });
  });
});
