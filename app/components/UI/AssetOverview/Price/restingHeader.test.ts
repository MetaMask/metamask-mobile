import {
  createRestingHeaderStore,
  formatBalanceAtPrice,
  formatSignedPercent,
} from './restingHeader';

jest.mock('../../../hooks/useFormatters', () => ({
  getLocaleLanguageCode: () => 'en-US',
}));

describe('formatBalanceAtPrice', () => {
  it('multiplies the token amount by the unit price', () => {
    expect(formatBalanceAtPrice(0.00009, 2065.64, 'usd')).toBe('$0.19');
  });

  it('returns undefined when the unit price is missing', () => {
    expect(formatBalanceAtPrice(1, undefined, 'usd')).toBeUndefined();
    expect(formatBalanceAtPrice(1, 0, 'usd')).toBeUndefined();
  });

  it('returns undefined when the amount is missing', () => {
    expect(formatBalanceAtPrice(undefined, 10, 'usd')).toBeUndefined();
  });
});

describe('formatSignedPercent', () => {
  it('prefixes a positive change with a plus', () => {
    expect(formatSignedPercent(2.3)).toBe('+2.30%');
  });

  it('keeps the minus on a negative change', () => {
    expect(formatSignedPercent(-2.34)).toBe('-2.34%');
  });
});

describe('createRestingHeaderStore', () => {
  it('notifies subscribers only when the price or percent changes', () => {
    const store = createRestingHeaderStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.set({ price: 10, percent: 1 });
    store.set({ price: 10, percent: 1 });
    store.set({ price: 11, percent: 1 });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual({ price: 11, percent: 1 });
  });
});
