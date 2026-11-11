import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import {
  readCachedVaultShareValuations,
  VAULT_SHARE_VALUATION_CACHE_LIMIT,
  writeCachedVaultShareValuations,
} from './moneyVaultShareValuationCache';
import type { VaultShareValuationCacheEntry } from './vaultShareValuations';

jest.mock('../../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  getItemSync: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetItemSync = StorageWrapper.getItemSync as jest.Mock;
const mockSetItem = StorageWrapper.setItem as jest.Mock;
const mockLoggerError = Logger.error as jest.Mock;

const ACCOUNT = '0xabcdef0123456789012345678901234567890123';
const VAULT = '0x1111111111111111111111111111111111111111';

function entry(index = 0): VaultShareValuationCacheEntry {
  return {
    account: ACCOUNT,
    chainId: 143,
    vaultAddress: VAULT,
    txHash: `0x${index.toString(16).padStart(64, '0')}`,
    valuations: [
      {
        type: 'transfer_out',
        logIndex: 1,
        blockNumber: 2,
        sharesWei: '3',
        assetsWei: '4',
        assetDecimals: 6,
      },
    ],
  };
}

function cacheDocument(entries: VaultShareValuationCacheEntry[]): string {
  return JSON.stringify({ version: 1, entries });
}

describe('moneyVaultShareValuationCache', () => {
  let stored: string | null;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = null;
    mockGet = mockGetItemSync as jest.Mock;
    mockGet.mockImplementation(() => stored);
    mockSetItem.mockImplementation(async (_key: string, value: string) => {
      await Promise.resolve();
      stored = value;
    });
  });

  it('returns an empty list when storage has no document', () => {
    expect(readCachedVaultShareValuations()).toEqual([]);
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['the wrong version', JSON.stringify({ version: 2, entries: [entry()] })],
    ['the wrong entry shape', JSON.stringify({ version: 1, entries: [{}] })],
  ])('returns an empty list for %s', (_label, raw) => {
    mockGet.mockReturnValue(raw);

    expect(readCachedVaultShareValuations()).toEqual([]);
  });

  it('writes a versioned document', async () => {
    await writeCachedVaultShareValuations([entry()]);

    expect(mockSetItem).toHaveBeenCalledWith(
      'money.activity.vault-share-valuations.v1',
      cacheDocument([entry()]),
    );
  });

  it('merges concurrent writes against the latest disk state', async () => {
    await Promise.all([
      writeCachedVaultShareValuations([entry(1)]),
      writeCachedVaultShareValuations([entry(2)]),
    ]);

    expect(readCachedVaultShareValuations()).toEqual([entry(1), entry(2)]);
  });

  it('replaces an existing entry without moving its FIFO position', async () => {
    stored = cacheDocument([entry(1), entry(2)]);
    const replacement = {
      ...entry(1),
      valuations: [{ ...entry(1).valuations[0], assetsWei: '5' }],
    };

    await writeCachedVaultShareValuations([replacement]);

    expect(readCachedVaultShareValuations()).toEqual([replacement, entry(2)]);
  });

  it('keeps at most the cache limit and evicts the oldest entries first', async () => {
    const entries = Array.from(
      { length: VAULT_SHARE_VALUATION_CACHE_LIMIT + 1 },
      (_, index) => entry(index),
    );

    await writeCachedVaultShareValuations(entries);

    const cached = readCachedVaultShareValuations();
    expect(cached).toHaveLength(VAULT_SHARE_VALUATION_CACHE_LIMIT);
    expect(cached[0]).toEqual(entry(1));
    expect(cached.at(-1)).toEqual(entry(VAULT_SHARE_VALUATION_CACHE_LIMIT));
  });

  it('logs and swallows a write failure', async () => {
    const error = new Error('disk full');
    mockSetItem.mockRejectedValue(error);

    await expect(writeCachedVaultShareValuations([entry()])).resolves.toBe(
      undefined,
    );
    expect(mockLoggerError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        context: expect.objectContaining({
          name: 'moneyVaultShareValuationCache',
        }),
      }),
    );
  });
});
