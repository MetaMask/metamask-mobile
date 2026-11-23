import StorageWrapper from '../../../store/storage-wrapper';
import {
  readWatchlistOrder,
  writeWatchlistOrder,
} from './watchlistOrderStorage';

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = jest.mocked(StorageWrapper.getItem);
const mockSetItem = jest.mocked(StorageWrapper.setItem);

describe('watchlistOrderStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads legacy and versioned payloads', async () => {
    mockGetItem
      .mockResolvedValueOnce(
        JSON.stringify(['perp:btc', 'token:eth', 'perp:btc']),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          version: 1,
          keys: ['token:eth', 'perp:btc'],
        }),
      );

    await expect(readWatchlistOrder('group-1')).resolves.toEqual([
      'perp:btc',
      'token:eth',
    ]);
    await expect(readWatchlistOrder('group-1')).resolves.toEqual([
      'token:eth',
      'perp:btc',
    ]);
  });

  it('rejects storage and corrupt-payload failures', async () => {
    const storageError = new Error('storage unavailable');
    mockGetItem
      .mockRejectedValueOnce(storageError)
      .mockResolvedValueOnce('{not-json');

    await expect(readWatchlistOrder('group-1')).rejects.toBe(storageError);
    await expect(readWatchlistOrder('group-1')).rejects.toBeInstanceOf(
      SyntaxError,
    );
  });

  it('writes a deduplicated versioned payload', async () => {
    mockSetItem.mockResolvedValue(undefined);

    await writeWatchlistOrder('group-1', [
      'token:eth',
      'perp:btc',
      'token:eth',
    ]);

    expect(mockSetItem).toHaveBeenCalledWith(
      '@MetaMask:watchlistOrder:group-1',
      JSON.stringify({
        version: 1,
        keys: ['token:eth', 'perp:btc'],
      }),
    );
  });
});
