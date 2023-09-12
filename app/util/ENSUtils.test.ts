import { isDefaultAccountName, getCachedENSName, ENSCache } from './ENSUtils';

const mockAddress = '0x0000000000000000000000000000000000000001';

// TODO: Stub this in individual tests using `jest.replaceProperty` after the
// update to Jest v29
let originalCacheContents: typeof ENSCache.cache;

describe('getCachedENSName', () => {
  beforeEach(() => {
    originalCacheContents = ENSCache.cache;
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    // This prevents
    ENSCache.cache = originalCacheContents;
  });

  it('returns undefined for unsupported chain IDs', () => {
    ENSCache.cache = {};

    expect(getCachedENSName(mockAddress, '12345')).toBeUndefined();
  });

  it('returns undefined if there is no cached entry', () => {
    ENSCache.cache = {};

    expect(getCachedENSName(mockAddress, '1')).toBeUndefined();
  });

  it('returns a cached ENS name', () => {
    const networkId = '1';
    ENSCache.cache = {
      [`${networkId}${mockAddress}`]: {
        name: 'cachedname.metamask.eth',
        timestamp: Date.now(),
      },
    };

    expect(getCachedENSName(mockAddress, networkId)).toBe(
      'cachedname.metamask.eth',
    );
  });
});

describe('isDefaultAccountName', () => {
  const accountNameDefaultOne = 'Account 1';
  it('should match RegEx if name "Account 1" has default pattern', () => {
    expect(isDefaultAccountName(accountNameDefaultOne)).toEqual(true);
  });
  const accountNameDefaultTwo = 'Account 99999';
  it('should match RegEx if name "Account 99999" has default pattern', () => {
    expect(isDefaultAccountName(accountNameDefaultTwo)).toEqual(true);
  });
  const accountNameEmpty = '';
  it('should not match RegEx if name is empty', () => {
    expect(isDefaultAccountName(accountNameEmpty)).toEqual(false);
  });
  const accountNameUndefined = undefined;
  it('should not match RegEx if name is undefined', () => {
    expect(isDefaultAccountName(accountNameUndefined)).toEqual(false);
  });
  const accountNameNotDefault = 'Johns Wallet';
  it('should not match RegEx if name does not has default pattern', () => {
    expect(isDefaultAccountName(accountNameNotDefault)).toEqual(false);
  });
});
