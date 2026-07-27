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

const mockCall = Engine.controllerMessenger.call as jest.Mock;
const GET_ACTION = 'AuthenticatedUserStorageService:getAssetsWatchlist';
const SET_ACTION = 'AuthenticatedUserStorageService:setAssetsWatchlist';
const CLIENT_TYPE = 'mobile';

describe('watchlist storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue(undefined);
  });

  describe('EMPTY_BLOB', () => {
    it('exposes a valid empty blob with version 1 and no assets', () => {
      expect(EMPTY_BLOB).toStrictEqual({ assets: [], version: 1 });
    });
  });

  describe('readFromTokenWatchList', () => {
    it('reads via the assets-watchlist SDK action', async () => {
      mockCall.mockResolvedValue(null);

      await readFromTokenWatchList();

      expect(mockCall).toHaveBeenCalledWith(GET_ACTION);
    });

    it('returns EMPTY_BLOB when SDK returns null', async () => {
      mockCall.mockResolvedValue(null);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(EMPTY_BLOB);
    });

    it('returns EMPTY_BLOB when SDK returns undefined', async () => {
      mockCall.mockResolvedValue(undefined);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(EMPTY_BLOB);
    });

    it('parses a fully populated valid blob from SDK', async () => {
      const blob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc', 'eip155:1/erc20:0xdef'],
        version: 1,
      };
      mockCall.mockResolvedValue(blob);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(blob);
    });

    it.each([
      {
        case: 'schema defaults for missing fields',
        value: {},
        expected: EMPTY_BLOB,
      },
      {
        case: 'the default version when only assets is provided',
        value: { assets: ['eip155:1/erc20:0xabc'] },
        expected: { assets: ['eip155:1/erc20:0xabc'], version: 1 },
      },
    ])('applies $case', async ({ value, expected }) => {
      mockCall.mockResolvedValue(value);

      const result = await readFromTokenWatchList();

      expect(result).toStrictEqual(expected);
    });

    it.each([
      {
        case: 'the blob has the wrong asset type',
        value: { assets: [123], version: 1 },
      },
      {
        case: 'the blob has a non-literal version',
        value: { assets: [], version: 2 },
      },
      {
        case: 'the SDK value is not an object',
        value: 'not-an-object',
      },
    ])('throws when $case', async ({ value }) => {
      mockCall.mockResolvedValue(value);

      await expect(readFromTokenWatchList()).rejects.toThrow();
    });
  });

  describe('writeToTokenWatchList', () => {
    it('writes a validated blob via the assets-watchlist SDK action', async () => {
      const blob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc'],
        version: 1,
      };

      await writeToTokenWatchList(blob);

      expect(mockCall).toHaveBeenCalledWith(SET_ACTION, blob, CLIENT_TYPE);
    });

    it('writes EMPTY_BLOB correctly', async () => {
      await writeToTokenWatchList(EMPTY_BLOB);

      expect(mockCall).toHaveBeenCalledWith(
        SET_ACTION,
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

  describe('read + write interaction', () => {
    it('writes then reads using the expected SDK actions', async () => {
      const blob: WatchlistBlob = {
        assets: ['eip155:1/erc20:0xabc', 'eip155:137/erc20:0xdef'],
        version: 1,
      };

      mockCall.mockResolvedValueOnce(undefined).mockResolvedValueOnce(blob);
      await writeToTokenWatchList(blob);
      const result = await readFromTokenWatchList();

      expect(mockCall).toHaveBeenNthCalledWith(
        1,
        SET_ACTION,
        blob,
        CLIENT_TYPE,
      );
      expect(mockCall).toHaveBeenNthCalledWith(2, GET_ACTION);
      expect(result).toStrictEqual(blob);
    });
  });
});
