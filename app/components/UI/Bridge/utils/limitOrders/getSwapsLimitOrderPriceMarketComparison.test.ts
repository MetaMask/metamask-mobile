import { strings } from '../../../../../../locales/i18n';
import { getSwapsLimitOrderPriceMarketComparison } from './getSwapsLimitOrderPriceMarketComparison';

describe('getSwapsLimitOrderPriceMarketComparison', () => {
  describe('returns undefined for invalid inputs', () => {
    it.each([
      { limitFiat: undefined, marketFiat: 100 },
      { limitFiat: '100', marketFiat: undefined },
      { limitFiat: '0', marketFiat: 100 },
      { limitFiat: '100', marketFiat: 0 },
      { limitFiat: 'invalid', marketFiat: 100 },
    ])(
      'returns undefined for limitFiat=$limitFiat marketFiat=$marketFiat',
      ({ limitFiat, marketFiat }) => {
        const result = getSwapsLimitOrderPriceMarketComparison({
          limitFiat,
          marketFiat,
        });

        expect(result).toBeUndefined();
      },
    );
  });

  describe('zero displayed percent', () => {
    it.each(['100', '100.001', '99.999'])(
      'returns undefined when limitFiat=%s rounds to 0.00% from market',
      (limitFiat) => {
        const result = getSwapsLimitOrderPriceMarketComparison({
          limitFiat,
          marketFiat: 100,
        });

        expect(result).toBeUndefined();
      },
    );
  });

  describe('limit above market', () => {
    it('returns a positive above-market label', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '104',
        marketFiat: 100,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market_above', {
          percent: '4.00',
        }),
        isNegative: false,
      });
    });

    it('returns a positive label for a small difference', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '100.5',
        marketFiat: 100,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market_above', {
          percent: '0.50',
        }),
        isNegative: false,
      });
    });

    it.each(['10099.01', '55570.83576252', '136108303235.9'])(
      'caps the percent at >9999 when limitFiat=%s is far above market',
      (limitFiat) => {
        const result = getSwapsLimitOrderPriceMarketComparison({
          limitFiat,
          marketFiat: 100,
        });

        expect(result).toEqual({
          label: strings('bridge.limit.from_market_above_capped', {
            percent: '9999',
          }),
          isNegative: false,
        });
      },
    );

    it('renders the capped label with a > prefix', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '136108303235.9',
        marketFiat: 100,
      });

      expect(result?.label).toBe('(>+9999% from market)');
    });

    it('does not cap the percent at exactly 9999', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '10099',
        marketFiat: 100,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market_above', {
          percent: '9999.00',
        }),
        isNegative: false,
      });
    });
  });

  describe('limit below market', () => {
    it('returns a negative below-market label', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '90',
        marketFiat: 100,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market', {
          percent: '10.00',
        }),
        isNegative: true,
      });
    });

    it('returns a negative label for a large difference far below market', () => {
      const result = getSwapsLimitOrderPriceMarketComparison({
        limitFiat: '287',
        marketFiat: 2671,
      });

      expect(result).toEqual({
        label: strings('bridge.limit.from_market', {
          percent: '89.25',
        }),
        isNegative: true,
      });
    });
  });
});
