import { isCustomAction } from './index';

describe('isCustomAction', () => {
  it('returns true when quote.quote.isCustomAction is true', () => {
    const quote = {
      provider: 'paypal',
      quote: { isCustomAction: true },
    } as unknown as Parameters<typeof isCustomAction>[0];
    expect(isCustomAction(quote)).toBe(true);
  });

  it('returns false when isCustomAction is false', () => {
    const quote = {
      provider: 'paypal',
      quote: { isCustomAction: false },
    } as unknown as Parameters<typeof isCustomAction>[0];
    expect(isCustomAction(quote)).toBe(false);
  });

  it('returns false when isCustomAction is undefined', () => {
    const quote = {
      provider: 'moonpay',
      quote: {},
    } as unknown as Parameters<typeof isCustomAction>[0];
    expect(isCustomAction(quote)).toBe(false);
  });

  it('returns false when quote.quote is undefined', () => {
    const quote = {
      provider: 'test',
    } as unknown as Parameters<typeof isCustomAction>[0];
    expect(isCustomAction(quote)).toBe(false);
  });
});
