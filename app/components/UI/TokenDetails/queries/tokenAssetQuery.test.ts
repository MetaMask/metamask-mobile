import { waitFor } from '@testing-library/react-native';
import { hashKey } from '@tanstack/react-query';
import StorageWrapper from '../../../../store/storage-wrapper';
import { renderHookWithQueryClient } from '../../../../util/test/renderHookWithQueryClient';
import { TOKEN_API_BASE_URL } from '../../Assets/watchlist/utils/getTokens';
import { useTokenAssetDetails } from './tokenAssetQuery';

const ASSET_ID = 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';
const OTHER_ASSET_ID =
  'eip155:1/erc20:0x0000000000000000000000000000000000000001';
const STORAGE_KEY = 'networking.query.v1:slot:token-details-metadata.v1';
const METADATA = {
  assetId: ASSET_ID,
  symbol: 'DAI',
  name: 'Dai',
  decimals: 18,
  launchpadData: null,
};

describe('useTokenAssetDetails', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const getCache = jest.mocked(StorageWrapper.getItemSync);
  const setCache = jest.mocked(StorageWrapper.setItem);

  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
    getCache.mockReset().mockReturnValue(null);
    setCache.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('keeps holder count in memory but stores neither holders nor market data on disk', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          ...METADATA,
          marketData: { price: '1' },
          holders: { count: 42, top: [{ address: '0xabc', balance: '1' }] },
        },
      ],
    });

    const { result } = renderHookWithQueryClient(() =>
      useTokenAssetDetails(ASSET_ID),
    );

    await waitFor(() =>
      expect(result.current.asset?.holders).toEqual({ count: 42 }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `${TOKEN_API_BASE_URL}/v2/assets?assetIds=${encodeURIComponent(ASSET_ID)}`,
      ),
      expect.objectContaining({ cache: 'no-cache' }),
    );
    expect(setCache).toHaveBeenCalledTimes(1);
    const [key, value] = setCache.mock.calls[0];
    expect(key).toBe(STORAGE_KEY);
    expect(JSON.parse(value)).toEqual({
      body: [METADATA],
      savedAt: expect.any(Number),
      identity: hashKey([
        'token-details',
        'v2-assets',
        ASSET_ID,
        TOKEN_API_BASE_URL,
      ]),
    });
  });

  it('restores metadata on first render and still refreshes from the network', async () => {
    getCache.mockReturnValue(
      JSON.stringify({
        savedAt: Date.now(),
        identity: hashKey([
          'token-details',
          'v2-assets',
          ASSET_ID,
          TOKEN_API_BASE_URL,
        ]),
        body: [METADATA],
      }),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [
        { ...METADATA, name: 'Updated Dai', holders: { count: 3 } },
      ],
    });

    const { result } = renderHookWithQueryClient(() =>
      useTokenAssetDetails(ASSET_ID),
    );

    expect(result.current.asset).toEqual({ ...METADATA, holders: null });
    expect(result.current.isLoading).toBe(false);
    await waitFor(() => expect(result.current.asset?.name).toBe('Updated Dai'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never restores metadata for a different token', async () => {
    getCache.mockReturnValue(
      JSON.stringify({
        savedAt: Date.now(),
        identity: hashKey([
          'token-details',
          'v2-assets',
          ASSET_ID,
          TOKEN_API_BASE_URL,
        ]),
        body: [METADATA],
      }),
    );
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ ...METADATA, assetId: OTHER_ASSET_ID }],
    });

    const { result } = renderHookWithQueryClient(() =>
      useTokenAssetDetails(OTHER_ASSET_ID),
    );

    expect(result.current.asset).toBeNull();
    await waitFor(() =>
      expect(result.current.asset?.assetId).toBe(OTHER_ASSET_ID),
    );
    expect(setCache.mock.calls[0][0]).toBe(STORAGE_KEY);
  });

  it('does not save an invalid response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => [{ assetId: ASSET_ID }],
    });

    const { result } = renderHookWithQueryClient(() =>
      useTokenAssetDetails(ASSET_ID),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setCache).not.toHaveBeenCalled();
  });
});
