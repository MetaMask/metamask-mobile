import StorageWrapper from '../../../../store/storage-wrapper';
import {
  EMPTY_BLOB,
  WATCHLIST_STORAGE_PATH,
  readFromTokenWatchList,
  writeToTokenWatchList,
  type WatchlistBlob,
} from './storage';

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockedStorageWrapper = StorageWrapper as jest.Mocked<
  typeof StorageWrapper
>;

describe('watchlist storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WATCHLIST_STORAGE_PATH', () => {
    it('matches the agreed storage path from the tech spec', () => {
      expect(WATCHLIST_STORAGE_PATH).toBe('watchlistV1.tokens');
    });
  });

  describe('EMPTY_BLOB', () => {
    it('exposes a valid empty blob with version 1 and no assets', () => {
      expect(EMPTY_BLOB).toStrictEqual({ assets: [], version: 1 });
    });
  });

  describe('readFromTokenWatchList', () => {
    it('reads from the configured storage path', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue(null);

      await readFromTokenWatchList();

      expect(mockedStorageWrapper.getItem).toHaveBeenCalledWith(
        WATCHLIST_STORAGE_PATH,
      );
    });

    it('returns EMPTY_BLOB when storage is empty (null)', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue(null);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(EMPTY_BLOB);
    });

    it('returns EMPTY_BLOB when storage value is an empty string', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue('');

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(EMPTY_BLOB);
    });

    it('parses a fully populated valid blob from storage', async () => {
      const stored: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc', 'eip155:1/erc20:0xdef'],
        version: 1,
      };
      mockedStorageWrapper.getItem.mockResolvedValue(JSON.stringify(stored));

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(stored);
    });

    it('applies schema defaults for missing fields', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue(JSON.stringify({}));

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(EMPTY_BLOB);
    });

    it('applies the default version when only assets is provided', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue(
        JSON.stringify({ assets: ['eip155:1/erc20:0xabc'] }),
      );

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual({
        assets: ['eip155:1/erc20:0xabc'],
        version: 1,
      });
    });

    it('throws when the stored blob has the wrong asset type', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue(
        JSON.stringify({ assets: [123], version: 1 }),
      );

      await expect(readFromTokenWatchList()).rejects.toThrow();
    });

    it('throws when the stored blob has a non-literal version', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue(
        JSON.stringify({ assets: [], version: 2 }),
      );

      await expect(readFromTokenWatchList()).rejects.toThrow();
    });

    it('throws when the stored value is not valid JSON', async () => {
      mockedStorageWrapper.getItem.mockResolvedValue('{not-json');

      await expect(readFromTokenWatchList()).rejects.toThrow();
    });
  });

  describe('writeToTokenWatchList', () => {
    it('writes a validated blob to the configured storage path', async () => {
      const blob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc'],
        version: 1,
      };

      await writeToTokenWatchList(blob);

      expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
        WATCHLIST_STORAGE_PATH,
        JSON.stringify(blob),
      );
    });

    it('writes EMPTY_BLOB correctly', async () => {
      await writeToTokenWatchList(EMPTY_BLOB);

      expect(mockedStorageWrapper.setItem).toHaveBeenCalledWith(
        WATCHLIST_STORAGE_PATH,
        JSON.stringify(EMPTY_BLOB),
      );
    });

    it('rejects and does not write when the blob has the wrong asset type', async () => {
      const invalid = {
        assets: [123],
        version: 1,
      } as unknown as WatchlistBlob;

      await expect(writeToTokenWatchList(invalid)).rejects.toThrow();
      expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    });

    it('rejects and does not write when the blob has a non-literal version', async () => {
      const invalid = {
        assets: [],
        version: 2,
      } as unknown as WatchlistBlob;

      await expect(writeToTokenWatchList(invalid)).rejects.toThrow();
      expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    });

    it('rejects and does not write when assets is not an array', async () => {
      const invalid = {
        assets: 'not-an-array',
        version: 1,
      } as unknown as WatchlistBlob;

      await expect(writeToTokenWatchList(invalid)).rejects.toThrow();
      expect(mockedStorageWrapper.setItem).not.toHaveBeenCalled();
    });
  });

  describe('read/write round trip', () => {
    it('produces a value that can be read back as-is', async () => {
      const blob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc', 'eip155:137/erc20:0xdef'],
        version: 1,
      };

      mockedStorageWrapper.setItem.mockImplementation(async () => undefined);
      await writeToTokenWatchList(blob);

      const written = mockedStorageWrapper.setItem.mock.calls[0][1] as string;
      mockedStorageWrapper.getItem.mockResolvedValue(written);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(blob);
    });
  });
});
