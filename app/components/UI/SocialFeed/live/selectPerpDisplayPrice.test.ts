import { selectPerpDisplayPrice } from './selectPerpDisplayPrice';

describe('selectPerpDisplayPrice', () => {
  it('returns the oracle when the market is tradable', () => {
    const update = {
      price: '86.58',
      markPrice: '86.51',
      isTradable: true,
    };

    const price = selectPerpDisplayPrice(update);

    expect(price).toBe(86.51);
  });

  it('returns the live mid when the oracle has diverged', () => {
    const update = {
      price: '86.58',
      markPrice: '25.999',
      isTradable: false,
    };

    const price = selectPerpDisplayPrice(update);

    expect(price).toBe(86.58);
  });

  it('returns the live mid when the quote has no oracle', () => {
    const update = { price: '86.58' };

    const price = selectPerpDisplayPrice(update);

    expect(price).toBe(86.58);
  });

  it('returns undefined when neither price is usable', () => {
    const update = { price: '0', markPrice: 'not-a-price', isTradable: false };

    const price = selectPerpDisplayPrice(update);

    expect(price).toBeUndefined();
  });
});
