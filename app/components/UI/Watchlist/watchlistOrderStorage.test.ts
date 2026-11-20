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

  it('reads the legacy array payload and removes duplicate keys', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify(['perp:btc', 'token:eth', 'perp:btc']),
    );

    const result = await readWatchlistOrder('group-1');

    expect(result).toEqual(['perp:btc', 'token:eth']);
  });

  it('reads the versioned payload', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        version: 1,
        keys: ['token:eth', 'perp:btc'],
      }),
    );

    const result = await readWatchlistOrder('group-1');

    expect(result).toEqual(['token:eth', 'perp:btc']);
  });

  it('rejects storage read failures', async () => {
    const error = new Error('storage unavailable');
    mockGetItem.mockRejectedValue(error);

    await expect(readWatchlistOrder('group-1')).rejects.toBe(error);
  });

  it('rejects corrupt payloads', async () => {
    mockGetItem.mockResolvedValue('{not-json');

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
