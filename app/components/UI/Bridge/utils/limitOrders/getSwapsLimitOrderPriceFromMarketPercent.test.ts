import { BigNumber } from 'bignumber.js';
import { LimitOrderExecutionType } from '../../constants/limitOrders';
import { getSwapsLimitOrderPriceFromMarketPercent } from './getSwapsLimitOrderPriceFromMarketPercent';
import { getSwapsLimitOrderPriceMarketComparison } from './getSwapsLimitOrderPriceMarketComparison';

const tokenModeDefaults = {
  counterFiatRate: 2000,
  counterTokenDecimals: 18,
  isLimitFiatMode: false,
  marketFiat: 100,
};

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

    it('keeps sub-dollar market fiat so market compares as zero percent', () => {
      const marketFiat = 0.10298176120674981;

      const result = getSwapsLimitOrderPriceFromMarketPercent({
        counterFiatRate: 2448.4,
        counterTokenDecimals: 18,
        isLimitFiatMode: true,
        marketFiat,
        signedPercent: 0,
      });

      expect(result).not.toBe('0.1');
      expect(
        getSwapsLimitOrderPriceMarketComparison({
          limitFiat: result,
          marketFiat,
          executionType: LimitOrderExecutionType.BUY,
          threshold: 0,
        }),
      ).toBeUndefined();
    });
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
          executionType: LimitOrderExecutionType.BUY,
          threshold: 0,
        }),
      ).toBeUndefined();
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
