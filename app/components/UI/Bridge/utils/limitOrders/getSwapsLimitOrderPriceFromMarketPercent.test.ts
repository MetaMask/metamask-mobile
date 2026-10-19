import { BigNumber } from 'bignumber.js';
import { getSwapsLimitOrderPriceFromMarketPercent } from './getSwapsLimitOrderPriceFromMarketPercent';
import { getSwapsLimitOrderPriceMarketComparison } from './getSwapsLimitOrderPriceMarketComparison';
import { roundLimitOrderMarketFiatToInput } from './formatLimitOrderFiatPrice';

const tokenModeDefaults = {
  counterFiatRate: 2000,
  counterTokenDecimals: 18,
  isLimitFiatMode: false,
  marketFiat: 100,
};

// A quoted token worth a fraction of a cent, like PEPE.
const CHEAP_MARKET_FIAT = 0.0000039998;

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
        counterFiatRate: 2000,
        counterTokenDecimals: 18,
        isLimitFiatMode: true,
        marketFiat: 100,
        signedPercent: 0,
      });

      expect(result).toBe('100');
    });

    it('returns fiat above market when signed percent is positive', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate: 2000,
        counterTokenDecimals: 18,
        isLimitFiatMode: true,
        marketFiat: 100,
        signedPercent: 10,
      });

      expect(result).toBe('110');
    });

    it('returns fiat below market when signed percent is negative', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate: 2000,
        counterTokenDecimals: 18,
        isLimitFiatMode: true,
        marketFiat: 100,
        signedPercent: -5,
      });

      expect(result).toBe('95');
    });

    it('keeps four significant digits of a sub-dollar market fiat', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate: 2448.4,
        counterTokenDecimals: 18,
        isLimitFiatMode: true,
        marketFiat: 0.10298176120674981,
        signedPercent: 0,
      });

      expect(result).toBe('0.103');
    });

    it('rounds fiat to two decimal places when a percent is applied', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate: 2000,
        counterTokenDecimals: 18,
        isLimitFiatMode: true,
        marketFiat: 2345.6789,
        signedPercent: 5,
      });

      expect(result).toBe('2462.96');
    });

    it('keeps a sub-cent market fiat instead of rounding it to zero', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate: 2000,
        counterTokenDecimals: 18,
        isLimitFiatMode: true,
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
          counterFiatRate: 2000,
          counterTokenDecimals: 18,
          isLimitFiatMode: true,
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
          counterFiatRate: 2000,
          counterTokenDecimals: 18,
          isLimitFiatMode: true,
          marketFiat: CHEAP_MARKET_FIAT,
          signedPercent,
        });

        expect(
          getSwapsLimitOrderPriceMarketComparison({
            limitFiat: result,
            marketFiat: roundLimitOrderMarketFiatToInput(CHEAP_MARKET_FIAT),
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
        counterFiatRate,
        counterTokenDecimals: 18,
        isLimitFiatMode: false,
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

    describe('cheap quoted token priced in a 6-decimal stablecoin', () => {
      const cheapTokenInStablecoin = {
        counterFiatRate: 0.9998,
        counterTokenDecimals: 6,
        isLimitFiatMode: false,
        marketFiat: CHEAP_MARKET_FIAT,
      };

      it.each([
        { signedPercent: 0, expected: '0.0000040006' },
        { signedPercent: -5, expected: '0.00000380057' },
        { signedPercent: -10, expected: '0.00000360054' },
      ])(
        'keeps $signedPercent% from market beyond the counter token decimals',
        ({ signedPercent, expected }) => {
          const result = getSwapsLimitOrderPriceFromMarketPercent({
            ...cheapTokenInStablecoin,
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

    it('keeps a price worth less than the smallest unit of an 8-decimal counter token', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate: 100000,
        counterTokenDecimals: 8,
        isLimitFiatMode: false,
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

    it('returns undefined when counter token decimals are unavailable', () => {
      const result = getSwapsLimitOrderPriceFromMarketPercent({
        ...tokenModeDefaults,
        counterTokenDecimals: undefined,
        signedPercent: 0,
      });

      expect(result).toBeUndefined();
    });
  });
});
