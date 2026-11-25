import { PERPS_CONSTANTS, type AccountState } from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import {
  calculateCrossMarginAccountSummaryFromAccount,
  getCrossLiquidationRefreshKey,
  getCrossMarginRatioAlert,
  getCrossMarginRatioAlertLabel,
  getCrossMarginRatioTone,
  getCrossMarginSummaryThrottleMs,
  liquidationPriceForOrderSide,
  presentCrossLiquidationEstimate,
  selectOrderLiquidationRow,
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

  describe('getCrossLiquidationRefreshKey', () => {
    const account = {
      crossMarginSummary,
      spotCollateral: '0',
    } as AccountState;

    it('changes when the cross figures, spot, or open position change', () => {
      const base = getCrossLiquidationRefreshKey({
        account,
        positionSize: '4',
      });

      expect(
        getCrossLiquidationRefreshKey({
          account: {
            ...account,
            crossMarginSummary: { ...crossMarginSummary, accountValue: '900' },
          },
          positionSize: '4',
        }),
      ).not.toBe(base);
      expect(
        getCrossLiquidationRefreshKey({
          account: { ...account, spotCollateral: '50' },
          positionSize: '4',
        }),
      ).not.toBe(base);
      expect(
        getCrossLiquidationRefreshKey({ account, positionSize: '5' }),
      ).not.toBe(base);
    });

    it('keeps the key when only unrelated fields change', () => {
      expect(
        getCrossLiquidationRefreshKey({
          account: { ...account, totalBalance: '1234' },
          positionSize: '4',
        }),
      ).toBe(getCrossLiquidationRefreshKey({ account, positionSize: '4' }));
    });
  });

  describe('selectOrderLiquidationRow', () => {
    it('renders the cross estimate with its distance price', () => {
      expect(
        selectOrderLiquidationRow({
          isCrossOrder: true,
          crossEstimate: { status: 'price', price: '25.25' },
          hasValidAmount: true,
          isolatedPrice: '80',
        }),
      ).toEqual({
        display: '$25.25',
        rawPrice: '25.25',
        contentKey: 'cross_liquidation_price',
        distancePrice: 25.25,
      });
    });

    it('shows the fallback while the cross estimate is unavailable', () => {
      expect(
        selectOrderLiquidationRow({
          isCrossOrder: true,
          crossEstimate: { status: 'unavailable', reason: 'missing_inputs' },
          hasValidAmount: true,
          isolatedPrice: '80',
        }),
      ).toEqual({
        display: PERPS_CONSTANTS.FallbackDataDisplay,
        rawPrice: '',
        contentKey: 'cross_liquidation_estimate_unavailable',
        distancePrice: undefined,
      });
    });

    it('keeps the isolated price for an isolated order', () => {
      expect(
        selectOrderLiquidationRow({
          isCrossOrder: false,
          crossEstimate: undefined,
          hasValidAmount: true,
          isolatedPrice: '80',
        }),
      ).toEqual({
        display: '$80',
        rawPrice: '80',
        contentKey: 'liquidation_price',
        distancePrice: 80,
      });
    });

    it('shows the fallback when the isolated price is unavailable', () => {
      expect(
        selectOrderLiquidationRow({
          isCrossOrder: false,
          crossEstimate: undefined,
          hasValidAmount: true,
          isolatedPrice: undefined,
        }),
      ).toEqual({
        display: PERPS_CONSTANTS.FallbackDataDisplay,
        rawPrice: '',
        contentKey: 'liquidation_price',
        distancePrice: undefined,
      });
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
          estimate: { status: 'price', price: '2183.6007130124776' },
          hasValidAmount: true,
        }),
      ).toEqual({
        display: '$2,183.6',
        rawPrice: '2183.6007130124776',
        contentKey: 'cross_liquidation_price',
      });
      expect(
        presentCrossLiquidationEstimate({
          estimate: { status: 'none', reason: 'covered_by_account' },
          hasValidAmount: true,
        }),
      ).toEqual({
        display: strings('perps.cross_position.no_liquidation_price'),
        rawPrice: '',
        contentKey: 'cross_no_liquidation_price',
      });
      expect(
        presentCrossLiquidationEstimate({
          estimate: { status: 'unavailable', reason: 'account_unknown' },
          hasValidAmount: true,
        }).display,
      ).toBe(PERPS_CONSTANTS.FallbackDataDisplay);
    });

    it('shows the fallback before the first estimate or without an amount', () => {
      expect(
        presentCrossLiquidationEstimate({
          estimate: undefined,
          hasValidAmount: true,
        }).contentKey,
      ).toBe('cross_liquidation_estimate_unavailable');
      expect(
        presentCrossLiquidationEstimate({
          estimate: { status: 'price', price: '25' },
          hasValidAmount: false,
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
