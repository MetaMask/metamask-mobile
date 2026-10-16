import {
  isDefaultAccountName,
  getCachedENSName,
  doENSLookup,
  doENSReverseLookup,
  ENSCache,
} from './ENSUtils';

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
    const chainId = '0x1';
    ENSCache.cache = {
      [`${networkId}${mockAddress}`]: {
        name: 'cachedname.metamask.eth',
        timestamp: Date.now(),
      },
    };

    expect(getCachedENSName(mockAddress, chainId)).toBe(
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

const mockGetEnsAddress = jest.fn();
const mockGetEnsName = jest.fn();

jest.mock('../core/Engine', () => ({
  context: {
    NetworkController: {
      getProviderAndBlockTracker: () => ({ provider: { request: jest.fn() } }),
    },
  },
}));

jest.mock('viem', () => ({
  ...jest.requireActual('viem'),
  createPublicClient: () => ({
    getEnsAddress: mockGetEnsAddress,
    getEnsName: mockGetEnsName,
  }),
}));

describe('doENSLookup', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a name through the Universal Resolver client', async () => {
    mockGetEnsAddress.mockResolvedValue(mockAddress);

    expect(await doENSLookup('vitalik.eth', '0x1')).toBe(mockAddress);
    expect(mockGetEnsAddress).toHaveBeenCalledWith({ name: 'vitalik.eth' });
  });

  it('returns undefined when the name has no address', async () => {
    mockGetEnsAddress.mockResolvedValue(null);

    expect(await doENSLookup('nobody.eth', '0x1')).toBeUndefined();
  });

  it('returns undefined for an invalid name without calling the client', async () => {
    expect(await doENSLookup('bad..name.eth', '0x1')).toBeUndefined();
    expect(mockGetEnsAddress).not.toHaveBeenCalled();
  });

  it('returns undefined on unsupported chains', async () => {
    expect(await doENSLookup('vitalik.eth', '0x89')).toBeUndefined();
    expect(mockGetEnsAddress).not.toHaveBeenCalled();
  });
});

describe('doENSReverseLookup', () => {
  beforeEach(() => {
    originalCacheContents = ENSCache.cache;
    ENSCache.cache = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
    ENSCache.cache = originalCacheContents;
  });

  it('returns and caches the primary name', async () => {
    mockGetEnsName.mockResolvedValue('vitalik.eth');

    expect(await doENSReverseLookup(mockAddress, '0x1')).toBe('vitalik.eth');
    expect(mockGetEnsName).toHaveBeenCalledWith({ address: mockAddress });
    expect(getCachedENSName(mockAddress, '0x1')).toBe('vitalik.eth');
  });

  it('caches a miss when there is no primary name', async () => {
    mockGetEnsName.mockResolvedValue(null);

    expect(await doENSReverseLookup(mockAddress, '0x1')).toBeUndefined();
    expect(ENSCache.cache[`1${mockAddress}`].timestamp).toBeDefined();
    expect(getCachedENSName(mockAddress, '0x1')).toBeUndefined();
  });

  it('does not cache when the lookup throws', async () => {
    mockGetEnsName.mockRejectedValue(new Error('network'));

    expect(await doENSReverseLookup(mockAddress, '0x1')).toBeUndefined();
    expect(ENSCache.cache[`1${mockAddress}`]).toBeUndefined();
  });

  it('returns undefined on unsupported chains', async () => {
    expect(await doENSReverseLookup(mockAddress, '0x89')).toBeUndefined();
    expect(mockGetEnsName).not.toHaveBeenCalled();
  });
});
