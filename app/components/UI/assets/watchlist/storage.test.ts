import Engine from '../../../../core/Engine';
import {
  EMPTY_BLOB,
  readFromTokenWatchList,
  writeToTokenWatchList,
  type WatchlistBlob,
} from './storage';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

const GET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:getAssetsWatchlist';
const SET_ASSETS_WATCHLIST_ACTION =
  'AuthenticatedUserStorageService:setAssetsWatchlist';
const CLIENT_TYPE = 'mobile';
const mockCall = Engine.controllerMessenger.call as jest.Mock;

describe('watchlist storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EMPTY_BLOB', () => {
    it('exposes a valid empty blob with version 1 and no assets', () => {
      expect(EMPTY_BLOB).toStrictEqual({ assets: [], version: 1 });
    });
  });

  describe('readFromTokenWatchList', () => {
    it('reads watchlist data from authenticated user storage', async () => {
      mockCall.mockResolvedValue(null);

      await readFromTokenWatchList();

      expect(mockCall).toHaveBeenCalledWith(GET_ASSETS_WATCHLIST_ACTION);
    });

    it('returns EMPTY_BLOB when the watchlist row is missing', async () => {
      mockCall.mockResolvedValue(null);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(EMPTY_BLOB);
    });

    it('surfaces messenger errors', async () => {
      const error = new Error('sdk boom');
      mockCall.mockRejectedValue(error);

      await expect(readFromTokenWatchList()).rejects.toThrow(error);
    });

    it('parses a fully populated valid blob from authenticated storage', async () => {
      const remoteBlob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc', 'eip155:1/erc20:0xdef'],
        version: 1,
      };
      mockCall.mockResolvedValue(remoteBlob);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(remoteBlob);
    });

    it.each([
      {
        case: 'schema defaults for missing fields',
        remoteBlob: {},
        expected: EMPTY_BLOB,
      },
      {
        case: 'the default version when only assets is provided',
        remoteBlob: { assets: ['eip155:1/erc20:0xabc'] },
        expected: { assets: ['eip155:1/erc20:0xabc'], version: 1 },
      },
    ])('applies $case', async ({ remoteBlob, expected }) => {
      mockCall.mockResolvedValue(remoteBlob);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(expected);
    });

    it.each([
      {
        case: 'the returned blob has the wrong asset type',
        remoteBlob: { assets: [123], version: 1 },
      },
      {
        case: 'the returned blob has a non-literal version',
        remoteBlob: { assets: [], version: 2 },
      },
    ])('throws when $case', async ({ remoteBlob }) => {
      mockCall.mockResolvedValue(remoteBlob);

      await expect(readFromTokenWatchList()).rejects.toThrow();
    });
  });

  describe('writeToTokenWatchList', () => {
    it('writes a validated blob to authenticated user storage', async () => {
      const blob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc'],
        version: 1,
      };

      await writeToTokenWatchList(blob);

      expect(mockCall).toHaveBeenCalledWith(
        SET_ASSETS_WATCHLIST_ACTION,
        blob,
        CLIENT_TYPE,
      );
    });

    it('writes EMPTY_BLOB correctly', async () => {
      await writeToTokenWatchList(EMPTY_BLOB);

      expect(mockCall).toHaveBeenCalledWith(
        SET_ASSETS_WATCHLIST_ACTION,
        EMPTY_BLOB,
        CLIENT_TYPE,
      );
    });

    it.each([
      {
        case: 'the blob has the wrong asset type',
        invalid: { assets: [123], version: 1 },
      },
      {
        case: 'the blob has a non-literal version',
        invalid: { assets: [], version: 2 },
      },
      {
        case: 'assets is not an array',
        invalid: { assets: 'not-an-array', version: 1 },
      },
    ])('rejects and does not write when $case', async ({ invalid }) => {
      await expect(
        writeToTokenWatchList(invalid as unknown as WatchlistBlob),
      ).rejects.toThrow();
      expect(mockCall).not.toHaveBeenCalled();
    });
  });

  describe('read/write round trip', () => {
    it('produces a value that can be read back as-is', async () => {
      const blob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc', 'eip155:137/erc20:0xdef'],
        version: 1,
      };

      let persistedBlob: WatchlistBlob | null = null;
      mockCall.mockImplementation(
        async (action: string, payload?: WatchlistBlob) => {
          if (action === GET_ASSETS_WATCHLIST_ACTION) {
            return persistedBlob;
          }
          if (action === SET_ASSETS_WATCHLIST_ACTION) {
            persistedBlob = payload ?? null;
          }
          return undefined;
        },
      );

      await writeToTokenWatchList(blob);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(blob);
    });
  });
});
