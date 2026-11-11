import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { DAY } from '../../../../constants/time';
import {
  readCachedFirstPage,
  writeCachedFirstPage,
} from './moneyActivityCache';

jest.mock('../../../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetItemSync = StorageWrapper.getItemSync as jest.Mock;
const mockSetItem = StorageWrapper.setItem as jest.Mock;
const mockLoggerError = Logger.error as jest.Mock;

const ADDRESS = '0xAbCdEf0123456789012345678901234567890123';
const EXPECTED_KEY = `money.activity.page1.v1.${ADDRESS.toLowerCase()}`;
const NOW = 1_700_000_000_000;

const PAGE = {
  data: [{ hash: '0xabc' }],
  pageInfo: { hasNextPage: true, cursor: 'cursor-1' },
} as unknown as V1AccountTransactionsResponse;

describe('moneyActivityCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    mockSetItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('readCachedFirstPage', () => {
    it('returns the cached page when the entry is within TTL', () => {
      mockGetItemSync.mockReturnValue(
        JSON.stringify({ page: PAGE, cachedAt: NOW - 1000 }),
      );

      const result = readCachedFirstPage(ADDRESS);

      expect(mockGetItemSync).toHaveBeenCalledWith(EXPECTED_KEY);
      expect(result).toEqual({ page: PAGE, cachedAt: NOW - 1000 });
    });

    it('keys the cache by lowercased address so checksum casing cannot split it', () => {
      mockGetItemSync.mockReturnValue(null);

      readCachedFirstPage(ADDRESS.toUpperCase());

      expect(mockGetItemSync).toHaveBeenCalledWith(EXPECTED_KEY);
    });

    it('returns undefined when there is no entry', () => {
      mockGetItemSync.mockReturnValue(null);

      expect(readCachedFirstPage(ADDRESS)).toBeUndefined();
    });

    it('returns undefined for an address-less account', () => {
      expect(readCachedFirstPage('')).toBeUndefined();
      expect(mockGetItemSync).not.toHaveBeenCalled();
    });

    it('returns undefined when the entry has expired', () => {
      mockGetItemSync.mockReturnValue(
        JSON.stringify({ page: PAGE, cachedAt: NOW - DAY - 1 }),
      );

      expect(readCachedFirstPage(ADDRESS)).toBeUndefined();
    });

    it('returns undefined when the entry is stamped in the future', () => {
      mockGetItemSync.mockReturnValue(
        JSON.stringify({ page: PAGE, cachedAt: NOW + 1000 }),
      );

      expect(readCachedFirstPage(ADDRESS)).toBeUndefined();
    });

    it('returns undefined for unparseable JSON', () => {
      mockGetItemSync.mockReturnValue('{not json');

      expect(readCachedFirstPage(ADDRESS)).toBeUndefined();
    });

    it('returns undefined for a well-formed entry of the wrong shape', () => {
      mockGetItemSync.mockReturnValue(JSON.stringify({ page: null }));

      expect(readCachedFirstPage(ADDRESS)).toBeUndefined();
    });

    it('returns undefined when storage throws', () => {
      mockGetItemSync.mockImplementation(() => {
        throw new Error('mmkv unavailable');
      });

      expect(readCachedFirstPage(ADDRESS)).toBeUndefined();
    });
  });

  describe('writeCachedFirstPage', () => {
    it('writes the page stamped with the current time', () => {
      writeCachedFirstPage(ADDRESS, PAGE);

      expect(mockSetItem).toHaveBeenCalledWith(
        EXPECTED_KEY,
        JSON.stringify({ page: PAGE, cachedAt: NOW }),
      );
    });

    it('does not write for an address-less account', () => {
      writeCachedFirstPage('', PAGE);

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('logs and swallows a storage failure', async () => {
      const error = new Error('disk full');
      mockSetItem.mockRejectedValue(error);

      writeCachedFirstPage(ADDRESS, PAGE);
      await Promise.resolve();

      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: expect.objectContaining({ name: 'moneyActivityCache' }),
        }),
      );
    });
  });
});
