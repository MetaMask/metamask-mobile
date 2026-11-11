import type { AccountState } from '@metamask/perps-controller';
import {
  calculateCrossMarginAccountSummary,
  calculateCrossMarginAccountSummaryFromAccount,
  estimateCrossLiquidationPrice,
  formatAccountLeverage,
  formatCrossMarginRatio,
  getCrossCollateral,
  getCrossMarginRatioTone,
} from './crossMarginSummary';

const crossMarginSummary = {
  accountValue: '1000',
  maintenanceMargin: '250',
  marginUsed: '500',
  notional: '12500',
};

describe('crossMarginSummary', () => {
  describe('getCrossCollateral', () => {
    it('adds spot collateral to the cross account value', () => {
      expect(getCrossCollateral(crossMarginSummary, 200)).toBe(1200);
    });

    it('returns undefined when the summary is missing', () => {
      expect(getCrossCollateral(undefined)).toBeUndefined();
    });
  });

  describe('calculateCrossMarginAccountSummary', () => {
    it('derives ratio, leverage and usage from the cross summary', () => {
      const result = calculateCrossMarginAccountSummary({
        totalEquity: '1000',
        crossMarginSummary,
      });

      expect(result).toEqual({
        maintenanceMargin: 250,
        accountRatio: 0.25,
        accountLeverage: 12.5,
        crossMarginUsage: 0.5,
      });
    });

    it('returns undefined metrics when the summary is missing', () => {
      const result = calculateCrossMarginAccountSummary({
        totalEquity: '1000',
        crossMarginSummary: undefined,
      });

      expect(result).toEqual({
        maintenanceMargin: undefined,
        accountRatio: undefined,
        accountLeverage: undefined,
        crossMarginUsage: undefined,
      });
    });

    it('returns undefined ratios when collateral is zero', () => {
      const result = calculateCrossMarginAccountSummary({
        totalEquity: '0',
        crossMarginSummary: { ...crossMarginSummary, accountValue: '0' },
      });

      expect(result.accountRatio).toBeUndefined();
      expect(result.crossMarginUsage).toBeUndefined();
      expect(result.accountLeverage).toBeUndefined();
    });

    it('returns undefined for non-numeric inputs', () => {
      const result = calculateCrossMarginAccountSummary({
        totalEquity: 'abc',
        crossMarginSummary: { ...crossMarginSummary, maintenanceMargin: '' },
      });

      expect(result.maintenanceMargin).toBeUndefined();
      expect(result.accountRatio).toBeUndefined();
      expect(result.accountLeverage).toBeUndefined();
    });
  });

  describe('calculateCrossMarginAccountSummaryFromAccount', () => {
    it('reads totals from the account state', () => {
      const account = {
        totalBalance: '2000',
        crossMarginSummary,
      } as AccountState;

      const result = calculateCrossMarginAccountSummaryFromAccount(account);

      expect(result.accountLeverage).toBe(6.25);
      expect(result.accountRatio).toBe(0.25);
    });

    it('handles a null account', () => {
      expect(
        calculateCrossMarginAccountSummaryFromAccount(null).accountRatio,
      ).toBeUndefined();
    });
  });

  describe('getCrossMarginRatioTone', () => {
    it.each([
      [undefined, undefined],
      [0, 'safe'],
      [0.4999, 'safe'],
      [0.5, 'warning'],
      [0.75, 'warning'],
      [0.7501, 'danger'],
      [1.2, 'danger'],
    ])('maps %s to %s', (ratio, tone) => {
      expect(getCrossMarginRatioTone(ratio)).toBe(tone);
    });
  });

  describe('formatters', () => {
    it('formats the ratio as a percentage with at most one decimal', () => {
      expect(formatCrossMarginRatio(0.174)).toBe('17.4%');
      expect(formatCrossMarginRatio(0.634)).toBe('63.4%');
      expect(formatCrossMarginRatio(0.63)).toBe('63%');
      expect(formatCrossMarginRatio(0.8)).toBe('80%');
      expect(formatCrossMarginRatio(0.30004)).toBe('30%');
    });

    it('formats account leverage with at most 2 decimals', () => {
      expect(formatAccountLeverage(12.5)).toBe('12.5x');
      expect(formatAccountLeverage(3)).toBe('3x');
      expect(formatAccountLeverage(1.23456)).toBe('1.23x');
    });
  });

  describe('estimateCrossLiquidationPrice', () => {
    const params = {
      entryPrice: 100,
      size: 10,
      maxLeverage: 50,
      crossMarginSummary,
    };

    it.each([
      [true, 25.2525],
      [false, 173.2673],
    ])(
      'finds where equity meets maintenance margin (long: %s)',
      (isLong, expected) => {
        expect(
          estimateCrossLiquidationPrice({ ...params, isLong }),
        ).toBeCloseTo(expected, 4);
      },
    );

    it('returns undefined when the long cannot be liquidated', () => {
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: true,
          crossMarginSummary: { ...crossMarginSummary, accountValue: '5000' },
        }),
      ).toBeUndefined();
    });

    it('returns undefined without a cross summary or size', () => {
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: true,
          crossMarginSummary: undefined,
        }),
      ).toBeUndefined();
      expect(
        estimateCrossLiquidationPrice({ ...params, isLong: true, size: 0 }),
      ).toBeUndefined();
    });
  });
});
