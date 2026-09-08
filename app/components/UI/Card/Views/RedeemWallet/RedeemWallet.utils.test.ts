import {
  formatAmount,
  formatCurrency,
  getRedeemWithdrawalAmounts,
} from './RedeemWallet.utils';

describe('RedeemWallet.utils', () => {
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

    it('formats dust balances without float drift', () => {
      expect(formatAmount('0.0006')).toBe('0.0006');
    });

    it('returns 0.00 for NaN', () => {
      expect(formatAmount('invalid')).toBe('0.00');
    });
  });

  describe('getRedeemWithdrawalAmounts', () => {
    it('computes expected receive as balance minus fee rounded up', () => {
      const result = getRedeemWithdrawalAmounts('10.00', '0.50');

      expect(result.roundedFeeNum).toBe(0.5);
      expect(result.expectedToReceiveNumber).toBe(9.5);
    });

    it('rounds fee up before subtracting from balance', () => {
      const result = getRedeemWithdrawalAmounts('10.00', '0.50001');

      expect(result.roundedFeeNum).toBe(0.5001);
      expect(result.expectedToReceiveNumber).toBe(9.4999);
    });

    it('clamps expected receive at zero when fee exceeds balance', () => {
      const result = getRedeemWithdrawalAmounts('0.50', '1.00');

      expect(result.expectedToReceiveNumber).toBe(0);
    });

    it('handles zero fee', () => {
      const result = getRedeemWithdrawalAmounts('10.00', '0');

      expect(result.roundedFeeNum).toBe(0);
      expect(result.expectedToReceiveNumber).toBe(10);
    });

    it('handles invalid inputs', () => {
      const result = getRedeemWithdrawalAmounts('invalid', 'invalid');

      expect(result.roundedFeeNum).toBe(0);
      expect(result.expectedToReceiveNumber).toBe(0);
    });

    it('computes expected receive for dust-sized balances without float drift', () => {
      const result = getRedeemWithdrawalAmounts('0.0007', '0.0005');

      expect(result.roundedFeeNum).toBe(0.0005);
      expect(result.expectedToReceiveNumber).toBe(0.0002);
      expect(formatAmount(result.expectedToReceiveNumber)).toBe('0.0002');
    });

    it('marks insufficient when expected receive floors to zero despite positive remainder', () => {
      const result = getRedeemWithdrawalAmounts('0.50005', '0.5');

      expect(result.expectedToReceiveNumber).toBe(0);
      expect(result.hasInsufficientBalance).toBe(true);
    });

    it('marks insufficient when fee exceeds balance', () => {
      const result = getRedeemWithdrawalAmounts('0.50', '1.00');

      expect(result.hasInsufficientBalance).toBe(true);
    });

    it('marks sufficient when expected receive is above display precision', () => {
      const result = getRedeemWithdrawalAmounts('10.00', '0.50');

      expect(result.hasInsufficientBalance).toBe(false);
    });
  });
});
