import AppConstants from '../../../../core/AppConstants';
import { MMM_ORIGIN, MM_MOBILE_ORIGIN } from '../constants/confirmations';
import { isDappOrigin, isExternalAppOrigin } from './origin';

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

describe('isExternalAppOrigin', () => {
  it('returns true for the deeplink origin constant', () => {
    expect(isExternalAppOrigin(AppConstants.DEEPLINKS.ORIGIN_DEEPLINK)).toBe(
      true,
    );
    expect(isExternalAppOrigin('deeplink')).toBe(true);
  });

  it('returns false for verifiable dapp origins', () => {
    expect(isExternalAppOrigin('opensea.io')).toBe(false);
    expect(isExternalAppOrigin('https://uniswap.org')).toBe(false);
  });

  it('returns false for other deeplink-adjacent sources', () => {
    expect(isExternalAppOrigin(AppConstants.DEEPLINKS.ORIGIN_QR_CODE)).toBe(
      false,
    );
    expect(isExternalAppOrigin(AppConstants.DEEPLINKS.ORIGIN_BRAZE)).toBe(
      false,
    );
  });

  it('returns false for null, undefined, or empty origin', () => {
    expect(isExternalAppOrigin(null)).toBe(false);
    expect(isExternalAppOrigin(undefined)).toBe(false);
    expect(isExternalAppOrigin('')).toBe(false);
  });
});
