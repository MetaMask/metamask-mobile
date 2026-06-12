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

  it('returns true for the QR-code origin constant', () => {
    expect(isExternalAppOrigin(AppConstants.DEEPLINKS.ORIGIN_QR_CODE)).toBe(
      true,
    );
    expect(isExternalAppOrigin('qr-code')).toBe(true);
  });

  it('returns true for a bare connection UUID (SDK v1 channel id / MWP v2 connection id)', () => {
    expect(isExternalAppOrigin('a5ee1643-3832-4f04-9929-2dd008a36172')).toBe(
      true,
    );
    // UUID matching is case-insensitive.
    expect(isExternalAppOrigin('A5EE1643-3832-4F04-9929-2DD008A36172')).toBe(
      true,
    );
  });

  it('returns false for verifiable dapp origins', () => {
    expect(isExternalAppOrigin('opensea.io')).toBe(false);
    expect(isExternalAppOrigin('https://uniswap.org')).toBe(false);
    // A domain that merely contains a UUID-like substring is not a bare UUID.
    expect(
      isExternalAppOrigin('a5ee1643-3832-4f04-9929-2dd008a36172.example.com'),
    ).toBe(false);
  });

  it('returns false for other deeplink-adjacent sources we do trust', () => {
    expect(isExternalAppOrigin(AppConstants.DEEPLINKS.ORIGIN_BRAZE)).toBe(
      false,
    );
    expect(
      isExternalAppOrigin(AppConstants.DEEPLINKS.ORIGIN_IN_APP_BROWSER),
    ).toBe(false);
    expect(isExternalAppOrigin(AppConstants.DEEPLINKS.ORIGIN_CAROUSEL)).toBe(
      false,
    );
  });

  it('returns false for null, undefined, or empty origin', () => {
    expect(isExternalAppOrigin(null)).toBe(false);
    expect(isExternalAppOrigin(undefined)).toBe(false);
    expect(isExternalAppOrigin('')).toBe(false);
  });
});
