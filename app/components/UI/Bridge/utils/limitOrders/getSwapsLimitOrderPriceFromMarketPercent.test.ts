import { getSwapsLimitOrderPriceFromMarketPercent } from './getSwapsLimitOrderPriceFromMarketPercent';

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
