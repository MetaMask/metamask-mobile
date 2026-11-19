import { PERPS_CONSTANTS, type AccountState } from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import {
  calculateCrossMarginAccountSummaryFromAccount,
  estimateCrossLiquidationPrice,
  getCrossMarginRatioAlert,
  getCrossMarginRatioAlertLabel,
  getCrossMarginRatioTone,
  getCrossMarginSummaryThrottleMs,
  liquidationPriceForOrderSide,
  presentCrossLiquidationEstimate,
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

  describe('estimateCrossLiquidationPrice', () => {
    const params = {
      entryPrice: 100,
      size: 10,
      maxLeverage: 50,
      crossMarginSummary,
      spotCollateral: '0',
      providerId: 'hyperliquid' as const,
    };

    it.each([
      [true, 25.2525],
      [false, 173.2673],
    ])(
      'finds where equity meets maintenance margin (long: %s)',
      (isLong, expected) => {
        const estimate = estimateCrossLiquidationPrice({ ...params, isLong });

        expect(estimate.status).toBe('price');
        if (estimate.status === 'price') {
          expect(estimate.price).toBeCloseTo(expected, 4);
          expect(estimate.approximate).toBe(false);
        }
      },
    );

    it('returns unknown on a venue other than Hyperliquid', () => {
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: false,
          providerId: 'lighter',
        }),
      ).toEqual({ status: 'unknown' });
    });

    it('returns none when the long cannot be liquidated', () => {
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: true,
          crossMarginSummary: { ...crossMarginSummary, accountValue: '5000' },
        }),
      ).toEqual({ status: 'none' });
    });

    it('returns none when the order closes the position', () => {
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: false,
          size: 4,
          existingSignedSize: 4,
        }),
      ).toEqual({ status: 'none' });
    });

    it('replaces the open position maintenance with the resulting size', () => {
      // 4 long already open, buying 6 more. Existing maintenance at 1% is 4,
      // so 254 of reported maintenance leaves 250 on other positions. The
      // resulting size of 10 then matches the base case.
      const estimate = estimateCrossLiquidationPrice({
        ...params,
        isLong: true,
        size: 6,
        existingSignedSize: 4,
        crossMarginSummary: { ...crossMarginSummary, maintenanceMargin: '254' },
      });

      expect(estimate.status).toBe('price');
      if (estimate.status === 'price') {
        expect(estimate.price).toBeCloseTo(25.2525, 4);
      }
    });

    it('counts spot collateral and stays approximate while it is not published', () => {
      // 500 of spot lifts the short's liquidation from 173.2673 to 222.7723
      const withSpot = estimateCrossLiquidationPrice({
        ...params,
        isLong: false,
        spotCollateral: '500',
      });
      const withoutSpot = estimateCrossLiquidationPrice({
        ...params,
        isLong: true,
        spotCollateral: undefined,
      });

      expect(withSpot.status).toBe('price');
      if (withSpot.status === 'price') {
        expect(withSpot.price).toBeCloseTo(222.7723, 4);
        expect(withSpot.approximate).toBe(false);
      }
      expect(withoutSpot.status).toBe('price');
      if (withoutSpot.status === 'price') {
        expect(withoutSpot.approximate).toBe(true);
      }
    });

    it('marks tiered markets approximate', () => {
      const estimate = estimateCrossLiquidationPrice({
        ...params,
        isLong: true,
        marginTableId: 56,
      });

      expect(estimate.status).toBe('price');
      if (estimate.status === 'price') {
        expect(estimate.approximate).toBe(true);
        expect(estimate.price).toBeCloseTo(25.2525, 4);
      }
    });

    it('returns unknown without a cross summary, size, or max leverage', () => {
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: true,
          crossMarginSummary: undefined,
        }),
      ).toEqual({ status: 'unknown' });
      expect(
        estimateCrossLiquidationPrice({ ...params, isLong: true, size: 0 }),
      ).toEqual({ status: 'unknown' });
      expect(
        estimateCrossLiquidationPrice({
          ...params,
          isLong: true,
          maxLeverage: 0,
        }),
      ).toEqual({ status: 'unknown' });
    });
  });

  describe('liquidationPriceForOrderSide', () => {
    it('keeps the price when the order opens or adds on that side', () => {
      const price = liquidationPriceForOrderSide({
        liquidationPrice: '25.25',
        existingSignedSize: 4,
        orderSize: 6,
        orderIsLong: true,
      });

      expect(price).toBe('25.25');
    });

    it('keeps the price when the order flips onto the checked side', () => {
      const price = liquidationPriceForOrderSide({
        liquidationPrice: '173.26',
        existingSignedSize: 4,
        orderSize: 6,
        orderIsLong: false,
      });

      expect(price).toBe('173.26');
    });

    it('drops the price when a reduce leaves the opposite side', () => {
      const price = liquidationPriceForOrderSide({
        liquidationPrice: '25.25',
        existingSignedSize: 4,
        orderSize: 1,
        orderIsLong: false,
      });

      expect(price).toBe('');
    });

    it('keeps the price when the check uses the remaining side', () => {
      const price = liquidationPriceForOrderSide({
        liquidationPrice: '25.25',
        existingSignedSize: 4,
        orderSize: 1,
        orderIsLong: false,
        checkIsLong: true,
      });

      expect(price).toBe('25.25');
    });

    it('drops the price when the order closes the position', () => {
      const price = liquidationPriceForOrderSide({
        liquidationPrice: '25.25',
        existingSignedSize: 4,
        orderSize: 4,
        orderIsLong: false,
      });

      expect(price).toBe('');
    });

    it('returns an empty price unchanged', () => {
      const price = liquidationPriceForOrderSide({
        liquidationPrice: '',
        existingSignedSize: 4,
        orderSize: 1,
        orderIsLong: false,
      });

      expect(price).toBe('');
    });
  });

  describe('presentCrossLiquidationEstimate', () => {
    it('formats a price, the no-liquidation state, and the fallback dash', () => {
      expect(
        presentCrossLiquidationEstimate({
          estimate: {
            status: 'price',
            price: 2183.6007130124776,
            approximate: false,
          },
          hasValidAmount: true,
        }),
      ).toEqual({
        display: '$2,183.6',
        rawPrice: '2183.6007130124776',
        contentKey: 'cross_liquidation_price',
      });
      expect(
        presentCrossLiquidationEstimate({
          estimate: { status: 'none' },
          hasValidAmount: true,
        }).display,
      ).toBe(strings('perps.cross_position.no_liquidation_price'));
      expect(
        presentCrossLiquidationEstimate({
          estimate: { status: 'unknown' },
          hasValidAmount: true,
        }).display,
      ).toBe(PERPS_CONSTANTS.FallbackDataDisplay);
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
