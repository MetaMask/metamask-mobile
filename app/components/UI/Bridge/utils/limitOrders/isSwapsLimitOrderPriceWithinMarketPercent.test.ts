import { isSwapsLimitOrderPriceWithinMarketPercent } from './isSwapsLimitOrderPriceWithinMarketPercent';

const PERCENT = 1;

describe('isSwapsLimitOrderPriceWithinMarketPercent', () => {
  describe('returns false for unusable inputs', () => {
    it.each([
      { price: undefined, marketPrice: 100 },
      { price: '', marketPrice: 100 },
      { price: '0', marketPrice: 100 },
      { price: '-1', marketPrice: 100 },
      { price: 'invalid', marketPrice: 100 },
      { price: '100', marketPrice: undefined },
      { price: '100', marketPrice: 0 },
      { price: '100', marketPrice: -1 },
    ])(
      'returns false for price=$price marketPrice=$marketPrice',
      ({ price, marketPrice }) => {
        const result = isSwapsLimitOrderPriceWithinMarketPercent({
          price,
          marketPrice,
          percent: PERCENT,
        });

        expect(result).toBe(false);
      },
    );
  });

  it('returns true when the price equals market', () => {
    const result = isSwapsLimitOrderPriceWithinMarketPercent({
      price: '100',
      marketPrice: 100,
      percent: PERCENT,
    });

    expect(result).toBe(true);
  });

  it.each([
    { price: '101', marketPrice: 100 },
    { price: '99', marketPrice: 100 },
  ])(
    'returns true when the price is exactly 1% from market at $price',
    ({ price, marketPrice }) => {
      const result = isSwapsLimitOrderPriceWithinMarketPercent({
        price,
        marketPrice,
        percent: PERCENT,
      });

      expect(result).toBe(true);
    },
  );

  it.each([
    { price: '100.5', marketPrice: 100 },
    { price: '99.5', marketPrice: 100 },
  ])(
    'returns true when the price is inside the band at $price',
    ({ price, marketPrice }) => {
      const result = isSwapsLimitOrderPriceWithinMarketPercent({
        price,
        marketPrice,
        percent: PERCENT,
      });

      expect(result).toBe(true);
    },
  );

  it.each([
    { price: '101.01', marketPrice: 100 },
    { price: '98.99', marketPrice: 100 },
  ])(
    'returns false when the price is outside the band at $price',
    ({ price, marketPrice }) => {
      const result = isSwapsLimitOrderPriceWithinMarketPercent({
        price,
        marketPrice,
        percent: PERCENT,
      });

      expect(result).toBe(false);
    },
  );
});
