import { BigNumber } from 'bignumber.js';
import { isAccountFunded } from './isAccountFunded';

describe('isAccountFunded', () => {
  it('returns false when tokenTotal is undefined', () => {
    expect(isAccountFunded(undefined)).toBe(false);
  });

  it('returns false when tokenTotal is zero', () => {
    expect(isAccountFunded(new BigNumber(0))).toBe(false);
  });

  it('returns true when tokenTotal is positive', () => {
    expect(isAccountFunded(new BigNumber('0.01'))).toBe(true);
    expect(isAccountFunded(new BigNumber(100))).toBe(true);
  });

  it('returns false when tokenTotal is negative', () => {
    expect(isAccountFunded(new BigNumber(-1))).toBe(false);
  });
});
