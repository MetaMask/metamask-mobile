import type { AccountState } from '@metamask/perps-controller';
import {
  calculateCrossMarginAccountSummaryFromAccount,
  getCrossMarginRatioAlert,
  getCrossMarginRatioAlertLabel,
  getCrossAccountKey,
  getCrossMarginSummaryThrottleMs,
} from './crossMarginSummary';
import {
  CROSS_MARGIN_SUMMARY_SLOW_NETWORK_LOW_HARDWARE_THROTTLE_MS,
  CROSS_MARGIN_SUMMARY_SLOW_NETWORK_THROTTLE_MS,
} from '../constants/perpsConfig';

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
        spotCollateral: '0',
      } as AccountState;

      const result = calculateCrossMarginAccountSummaryFromAccount(account);

      expect(result).toEqual({
        maintenanceMargin: 250,
        accountRatio: 0.25,
        accountLeverage: 6.25,
        crossMarginUsage: 0.5,
      });
    });

    it('counts the account spot collateral in the ratio and usage', () => {
      const account = {
        totalBalance: '2000',
        crossMarginSummary: {
          ...crossMarginSummary,
          accountValue: '100',
          maintenanceMargin: '60',
          marginUsed: '60',
        },
        spotCollateral: '900',
      } as AccountState;

      const result = calculateCrossMarginAccountSummaryFromAccount(account);

      expect(result.accountRatio).toBeCloseTo(0.06, 10);
      expect(result.crossMarginUsage).toBeCloseTo(0.06, 10);
    });

    it('keeps the ratio and usage unknown until the account publishes spot collateral', () => {
      const account = {
        totalBalance: '2000',
        crossMarginSummary,
      } as AccountState;

      const result = calculateCrossMarginAccountSummaryFromAccount(account);

      expect(result.maintenanceMargin).toBe(250);
      expect(result.accountRatio).toBeUndefined();
      expect(result.crossMarginUsage).toBeUndefined();
    });

    it.each([
      // Standard: cross notional over the cross account value.
      ['disabled', 12.5],
      ['default', 12.5],
      // Unified, portfolio margin and unknown: over total equity.
      ['unifiedAccount', 6.25],
      [undefined, 6.25],
    ])('derives leverage for account mode %s', (accountMode, leverage) => {
      const result = calculateCrossMarginAccountSummaryFromAccount({
        totalBalance: '2000',
        crossMarginSummary,
        spotCollateral: '0',
        accountMode,
      } as AccountState);

      expect(result.accountLeverage).toBe(leverage);
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

  describe('getCrossAccountKey', () => {
    const account = {
      totalBalance: '2000',
      crossMarginSummary,
      spotCollateral: '10',
      accountMode: 'unifiedAccount',
    } as AccountState;

    it('changes with the figures a Cross estimate uses', () => {
      const key = getCrossAccountKey(account);

      expect(getCrossAccountKey({ ...account, totalBalance: '1' })).toBe(key);
      expect(getCrossAccountKey({ ...account, spotCollateral: '11' })).not.toBe(
        key,
      );
      expect(
        getCrossAccountKey({ ...account, accountMode: 'disabled' }),
      ).not.toBe(key);
      expect(
        getCrossAccountKey({
          ...account,
          crossMarginSummary: {
            ...crossMarginSummary,
            maintenanceMargin: '251',
          },
        }),
      ).not.toBe(key);
    });

    it('is undefined while the account is unknown', () => {
      expect(getCrossAccountKey(null)).toBeUndefined();
    });
  });

  describe('getCrossMarginRatioAlert', () => {
    it.each([
      [undefined, undefined],
      ['safe' as const, undefined],
      ['warning' as const, 'warning'],
      ['danger' as const, 'danger'],
    ])('maps %s to %s', (tone, alert) => {
      expect(getCrossMarginRatioAlert(tone)).toBe(alert);
    });

    it('masks the ratio while privacy mode is on', () => {
      expect(getCrossMarginRatioAlertLabel(0.8, true)).toBe('••••••');
      expect(getCrossMarginRatioAlertLabel(0.8, false)).toBe('80%');
    });
  });

  describe('getCrossMarginSummaryThrottleMs', () => {
    it.each([
      [
        'LOW',
        'SLOW_CELLULAR',
        CROSS_MARGIN_SUMMARY_SLOW_NETWORK_LOW_HARDWARE_THROTTLE_MS,
      ],
      ['MID', 'SLOW_CELLULAR', CROSS_MARGIN_SUMMARY_SLOW_NETWORK_THROTTLE_MS],
      [null, 'SLOW_CELLULAR', CROSS_MARGIN_SUMMARY_SLOW_NETWORK_THROTTLE_MS],
      ['LOW', 'WIFI', 1000],
      ['LOW', null, 1000],
      [null, null, 1000],
    ] as const)(
      'uses the matrix throttle for %s hardware on a %s network',
      (hardwareTier, networkTier, expected) => {
        expect(
          getCrossMarginSummaryThrottleMs({
            throttleMs: 1000,
            hardwareTier,
            networkTier,
          }),
        ).toBe(expected);
      },
    );

    it('keeps a caller throttle that is already slower than the matrix', () => {
      expect(
        getCrossMarginSummaryThrottleMs({
          throttleMs: 10000,
          hardwareTier: 'LOW',
          networkTier: 'SLOW_CELLULAR',
        }),
      ).toBe(10000);
    });
  });
});
