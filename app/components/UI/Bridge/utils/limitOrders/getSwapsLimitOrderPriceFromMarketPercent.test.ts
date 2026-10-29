import { BigNumber } from 'bignumber.js';
import { getSwapsLimitOrderPriceFromMarketPercent } from './getSwapsLimitOrderPriceFromMarketPercent';
import { getSwapsLimitOrderPriceMarketComparison } from './getSwapsLimitOrderPriceMarketComparison';
import {
  LIMIT_ORDER_PRICE_DECIMALS,
  roundLimitOrderMarketFiatToInput,
} from './formatLimitOrderFiatPrice';

const tokenModeDefaults = {
  counterFiatRate: 2000,
  decimals: LIMIT_ORDER_PRICE_DECIMALS,
  isLimitFiatMode: false,
  marketFiat: 100,
};

const fiatModeDefaults = {
  counterFiatRate: 2000,
  decimals: 2,
  isLimitFiatMode: true,
  marketFiat: 100,
};

// A quoted token worth a fraction of a cent, like PEPE, and the decimal places
// that keep four significant digits of its fiat price.
const CHEAP_MARKET_FIAT = 0.0000039998;
const CHEAP_FIAT_DECIMALS = 9;

describe('getSwapsLimitOrderPriceFromMarketPercent', () => {
  describe('returns undefined for invalid market fiat', () => {
    it.each([{ marketFiat: undefined }, { marketFiat: 0 }])(
      'returns undefined when marketFiat is $marketFiat',
      ({ marketFiat }) => {
        const result = getSwapsLimitOrderPriceFromMarketPercent({
          ...tokenModeDefaults,
          marketFiat,
          signedPercent: 0,
        });

        expect(result).toBeUndefined();
      },
    );
  });

  describe('returns undefined when adjusted market fiat is not positive', () => {
    it('returns undefined when signed percent drives adjusted fiat to zero', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        marketFiat: 100,
        signedPercent: -100,
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when signed percent drives adjusted fiat negative', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        marketFiat: 100,
        signedPercent: -150,
      });

      expect(result).toBeUndefined();
    });
  });

  describe('fiat limit price mode', () => {
    it('returns market fiat when signed percent is zero', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...fiatModeDefaults,
        signedPercent: 0,
      });

      expect(result).toBe('100');
    });

    it('returns fiat above market when signed percent is positive', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...fiatModeDefaults,
        signedPercent: 10,
      });

      expect(result).toBe('110');
    });

    it('returns fiat below market when signed percent is negative', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...fiatModeDefaults,
        signedPercent: -5,
      });

      expect(result).toBe('95');
    });

    it('rounds a sub-dollar market fiat to the given decimal places', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...fiatModeDefaults,
        counterFiatRate: 2448.4,
        decimals: 4,
        marketFiat: 0.10298176120674981,
        signedPercent: 0,
      });

      expect(result).toBe('0.103');
    });

    it('rounds fiat to two decimal places when a percent is applied', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...fiatModeDefaults,
        marketFiat: 2345.6789,
        signedPercent: 5,
      });

      expect(result).toBe('2462.96');
    });

    it('keeps a sub-cent market fiat instead of rounding it to zero', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...fiatModeDefaults,
        decimals: 6,
        marketFiat: 0.004,
        signedPercent: 0,
      });

      expect(result).toBe('0.004');
    });

    it.each([
      { signedPercent: 0, expected: '0.000004' },
      { signedPercent: -5, expected: '0.0000038' },
      { signedPercent: -10, expected: '0.0000036' },
    ])(
      'keeps $signedPercent% of a cheap token apart from market',
      ({ signedPercent, expected }) => {
        const result = getSwapsLimitOrderPriceFromMarketPercent({
          ...fiatModeDefaults,
          decimals: CHEAP_FIAT_DECIMALS,
          marketFiat: CHEAP_MARKET_FIAT,
          signedPercent,
        });

        expect(result).toBe(expected);
      },
    );

    it.each([
      { signedPercent: 0, expectedLabel: undefined },
      { signedPercent: -5, expectedLabel: '(-5.00% from market)' },
      { signedPercent: -10, expectedLabel: '(-10.00% from market)' },
    ])(
      'compares $signedPercent% of a cheap token with market as $expectedLabel',
      ({ signedPercent, expectedLabel }) => {
        const result = getSwapsLimitOrderPriceFromMarketPercent({
          ...fiatModeDefaults,
          decimals: CHEAP_FIAT_DECIMALS,
          marketFiat: CHEAP_MARKET_FIAT,
          signedPercent,
        });

        expect(
          getSwapsLimitOrderPriceMarketComparison({
            limitFiat: result,
            marketFiat: roundLimitOrderMarketFiatToInput(
              CHEAP_MARKET_FIAT,
              CHEAP_FIAT_DECIMALS,
            ),
          })?.label,
        ).toBe(expectedLabel);
      },
    );
  });

  describe('token limit price mode', () => {
    it('returns counter token amount at market when signed percent is zero', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        signedPercent: 0,
      });

      expect(result).toBe('0.05');
    });

    it('returns counter token amount above market when signed percent is positive', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        signedPercent: 10,
      });

      expect(result).toBe('0.055');
    });

    it('returns counter token amount below market when signed percent is negative', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        signedPercent: -5,
      });

      expect(result).toBe('0.0475');
    });

    it('does not round sub-dollar market through two-decimal fiat in token mode', () => {
      const marketFiat = 0.10298176120674981;
      const counterFiatRate = 2448.4;

      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        counterFiatRate,
        marketFiat,
        signedPercent: 0,
      });

      expect(result).not.toBe('0.00004');
      expect(
        getSwapsLimitOrderPriceMarketComparison({
          limitFiat: new BigNumber(result ?? 0)
            .multipliedBy(counterFiatRate)
            .toString(),
          marketFiat,
        }),
      ).toBeUndefined();
    });

    describe('cheap quoted token priced in a stablecoin', () => {
      const cheapTokenInStablecoin = {
        ...tokenModeDefaults,
        counterFiatRate: 0.9998,
        marketFiat: CHEAP_MARKET_FIAT,
      };

      it.each([
        { signedPercent: 0, expected: '0.0000040006' },
        { signedPercent: -5, expected: '0.00000380057' },
        { signedPercent: -10, expected: '0.00000360054' },
      ])(
        'rounds $signedPercent% from market down to the given decimal places',
        ({ signedPercent, expected }) => {
          const result = getSwapsLimitOrderPriceFromMarketPercent({
            ...cheapTokenInStablecoin,
            decimals: 11,
            signedPercent,
          });

          expect(result).toBe(expected);
        },
      );

      it.each([
        { signedPercent: 0, expectedLabel: undefined },
        { signedPercent: -5, expectedLabel: '(-5.00% from market)' },
        { signedPercent: -10, expectedLabel: '(-10.00% from market)' },
      ])(
        'compares $signedPercent% with market as $expectedLabel',
        ({ signedPercent, expectedLabel }) => {
          const result = getSwapsLimitOrderPriceFromMarketPercent({
            ...cheapTokenInStablecoin,
            signedPercent,
          });

          expect(
            getSwapsLimitOrderPriceMarketComparison({
              limitFiat: new BigNumber(result ?? 0)
                .multipliedBy(cheapTokenInStablecoin.counterFiatRate)
                .toString(),
              marketFiat: CHEAP_MARKET_FIAT,
            })?.label,
          ).toBe(expectedLabel);
        },
      );
    });

    it('keeps a price worth a tiny fraction of an expensive counter token', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        counterFiatRate: 100000,
        marketFiat: CHEAP_MARKET_FIAT,
        signedPercent: -5,
      });

      expect(result).toBe('0.0000000000379981');
    });

    it('returns undefined when counter fiat rate is unavailable', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        counterFiatRate: undefined,
        signedPercent: 0,
      });

      expect(result).toBeUndefined();
    });
  });
});
