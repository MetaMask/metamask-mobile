import type { AccountState } from '@metamask/perps-controller';
import {
  calculateCrossMarginAccountSummaryFromAccount,
  estimateCrossLiquidationPrice,
  getCrossMarginRatioTone,
} from './crossMarginSummary';

const crossMarginSummary = {
  accountValue: '1000',
  maintenanceMargin: '250',
  marginUsed: '500',
  notional: '12500',
};

describe('crossMarginSummary', () => {
  describe('calculateCrossMarginAccountSummaryFromAccount', () => {
    it('derives the summary from the account with no spot collateral', () => {
      const account = {
        totalBalance: '2000',
        crossMarginSummary,
      } as AccountState;

      const result = calculateCrossMarginAccountSummaryFromAccount(account);

      expect(result).toEqual({
        maintenanceMargin: 250,
        accountRatio: 0.25,
        accountLeverage: 6.25,
        crossMarginUsage: 0.5,
      });
    });

    it('returns undefined metrics for a null account', () => {
      expect(calculateCrossMarginAccountSummaryFromAccount(null)).toEqual({
        maintenanceMargin: undefined,
        accountRatio: undefined,
        accountLeverage: undefined,
        crossMarginUsage: undefined,
      });
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

    it('returns undefined without a cross summary, size, or max leverage', () => {
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
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: true,
          maxLeverage: 0,
        }),
      ).toBeUndefined();
    });
  });
});
