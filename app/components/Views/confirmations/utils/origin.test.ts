import { MMM_ORIGIN, MM_MOBILE_ORIGIN } from '../constants/confirmations';
import { isDappOrigin } from './origin';

describe('isDappOrigin', () => {
  it('returns true for dapp origins', () => {
    expect(isDappOrigin('uniswap.org')).toBe(true);
    expect(isDappOrigin('opensea.io')).toBe(true);
  });

  it('returns false for MetaMask origins', () => {
    expect(isDappOrigin(MMM_ORIGIN)).toBe(false);
    expect(isDappOrigin(MM_MOBILE_ORIGIN)).toBe(false);
  });

  it('returns false for null or undefined origins', () => {
    expect(isDappOrigin(null)).toBe(false);
    expect(isDappOrigin(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDappOrigin('')).toBe(false);
  });
});
