import { createMockToken } from '../testUtils';
import { hasMissingTokenFiatRate } from './hasMissingTokenFiatRate';

describe('hasMissingTokenFiatRate', () => {
  const token = createMockToken();

  it('returns false when no token is selected', () => {
    expect(hasMissingTokenFiatRate(undefined, undefined)).toBe(false);
  });

  it('returns true when the rate is unavailable', () => {
    expect(hasMissingTokenFiatRate(token, undefined)).toBe(true);
  });

  it('returns true when the rate is zero', () => {
    expect(hasMissingTokenFiatRate(token, 0)).toBe(true);
  });

  it('returns true when the rate is negative', () => {
    expect(hasMissingTokenFiatRate(token, -1)).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'returns true when the rate is %p',
    (fiatRate) => {
      expect(hasMissingTokenFiatRate(token, fiatRate)).toBe(true);
    },
  );

  it('returns false when the rate is a positive number', () => {
    expect(hasMissingTokenFiatRate(token, 0.0001)).toBe(false);
  });
});
