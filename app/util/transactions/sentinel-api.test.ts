import { Hex } from '@metamask/utils';
import {
  getSentinelNetworkFlags,
  buildUrl,
  SentinelNetwork,
  getSendBundleSupportedChains,
  isSendBundleSupported,
  clearSentinelNetworkCache,
} from './sentinel-api';

const fetchMock = jest.fn();

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});

const NETWORK_ETHEREUM_MOCK = 'ethereum-mainnet';

const COMMON_ETH: SentinelNetwork['nativeCurrency'] = {
  name: 'ETH',
  symbol: 'ETH',
  decimals: 18,
};
const COMMON_MATIC: SentinelNetwork['nativeCurrency'] = {
  name: 'MATIC',
  symbol: 'MATIC',
  decimals: 18,
};

const MAINNET_BASE = {
  name: 'Mainnet',
  group: 'ethereum',
  chainID: 1,
  nativeCurrency: COMMON_ETH,
  network: NETWORK_ETHEREUM_MOCK,
  explorer: 'https://etherscan.io',
  confirmations: true,
  smartTransactions: true,
  relayTransactions: true,
  hidden: false,
  sendBundle: true,
} as const;

const POLYGON_BASE = {
  name: 'Polygon',
  group: 'polygon',
  chainID: 137,
  nativeCurrency: COMMON_MATIC,
  network: 'polygon-mainnet',
  explorer: 'https://polygonscan.com',
  confirmations: true,
  smartTransactions: false,
  relayTransactions: false,
  hidden: false,
  sendBundle: false,
} as const;

const MOCK_NETWORKS: Record<string, SentinelNetwork> = {
  '1': { ...MAINNET_BASE },
  '137': { ...POLYGON_BASE },
};

describe('sentinel-api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSentinelNetworkCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('buildUrl', () => {
    it('builds the correct sentinel API URL for a subdomain', () => {
      expect(buildUrl('my-chain')).toBe(
        'https://tx-sentinel-my-chain.api.cx.metamask.io/',
      );
      expect(buildUrl(NETWORK_ETHEREUM_MOCK)).toBe(
        'https://tx-sentinel-ethereum-mainnet.api.cx.metamask.io/',
      );
    });
  });

  describe('getSentinelNetworkFlags', () => {
    const mainnetHex: Hex = '0x1';
    const polygonHex: Hex = '0x89';

    it('returns network data for provided chainId (Mainnet)', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      const result = await getSentinelNetworkFlags(mainnetHex);
      expect(result).toStrictEqual(MAINNET_BASE);
    });

    it('returns network data for another registered chainId (Polygon)', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      const result = await getSentinelNetworkFlags(polygonHex);
      expect(result).toStrictEqual(POLYGON_BASE);
    });

    it('returns undefined for chainId not in network data', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      const result = await getSentinelNetworkFlags('0xFAFA' as Hex);
      expect(result).toBeUndefined();
    });

    it('throws if getNetworkData throws', async () => {
      fetchMock.mockRejectedValueOnce(new Error('API connection error'));
      await expect(getSentinelNetworkFlags('0x1' as Hex)).rejects.toThrow(
        'API connection error',
      );
    });
  });

  describe('getSendBundleSupportedChains', () => {
    const chainIds: Hex[] = ['0x1', '0x89', '0xFAFA'];

    it('returns a map of chain IDs to sendBundle support status', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      const result = await getSendBundleSupportedChains(chainIds);
      expect(result).toEqual({
        '0x1': true,
        '0x89': false,
        '0xFAFA': false,
      });
    });

    it('returns false for unsupported chains', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      const result = await getSendBundleSupportedChains(['0xFAFA']);
      expect(result).toEqual({ '0xFAFA': false });
    });
  });

  describe('caching behavior', () => {
    it('caches network data and reuses it for subsequent calls', async () => {
      fetchMock.mockResolvedValue({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      await getSentinelNetworkFlags('0x1' as Hex);
      await getSentinelNetworkFlags('0x89' as Hex);
      await isSendBundleSupported('0x1' as Hex);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('fetches fresh data after cache is cleared', async () => {
      fetchMock.mockResolvedValue({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      await getSentinelNetworkFlags('0x1' as Hex);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      clearSentinelNetworkCache();

      await getSentinelNetworkFlags('0x1' as Hex);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent requests into a single fetch', async () => {
      fetchMock.mockResolvedValue({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      const results = await Promise.all([
        getSentinelNetworkFlags('0x1' as Hex),
        getSentinelNetworkFlags('0x89' as Hex),
        isSendBundleSupported('0x1' as Hex),
        getSendBundleSupportedChains(['0x1', '0x89']),
        getSentinelNetworkFlags('0x1' as Hex),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(results[0]).toStrictEqual(MAINNET_BASE);
      expect(results[1]).toStrictEqual(POLYGON_BASE);
      expect(results[2]).toBe(true);
      expect(results[3]).toEqual({ '0x1': true, '0x89': false });
    });

    it('fetches fresh data after cache TTL expires', async () => {
      // Spy is restored via jest.restoreAllMocks() in afterEach
      let mockTime = 1000;
      jest.spyOn(Date, 'now').mockImplementation(() => mockTime);

      fetchMock.mockResolvedValue({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      // First call - populates cache
      await getSentinelNetworkFlags('0x1' as Hex);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Call within TTL - uses cache
      mockTime = 1000 + 299_999; // Just under 5 minutes
      await getSentinelNetworkFlags('0x1' as Hex);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Call after TTL expires - fetches fresh
      mockTime = 1000 + 300_001; // Just over 5 minutes
      await getSentinelNetworkFlags('0x1' as Hex);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not cache HTTP error responses and allows retry', async () => {
      // First call returns HTTP error
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      } as Response);

      // Second call succeeds
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);

      // First call throws error
      await expect(getSentinelNetworkFlags('0x1' as Hex)).rejects.toThrow(
        'Failed to fetch sentinel network flags: 503 - Service Unavailable',
      );

      // Second call retries and succeeds (error was not cached)
      const result = await getSentinelNetworkFlags('0x1' as Hex);

      expect(result).toStrictEqual(MAINNET_BASE);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('propagates HTTP error to all concurrent callers without caching', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as Response);

      // All concurrent calls receive the same error
      const results = await Promise.allSettled([
        getSentinelNetworkFlags('0x1' as Hex),
        getSentinelNetworkFlags('0x89' as Hex),
        isSendBundleSupported('0x1' as Hex),
      ]);

      expect(results[0]).toEqual({
        status: 'rejected',
        reason: new Error(
          'Failed to fetch sentinel network flags: 500 - Internal Server Error',
        ),
      });
      expect(results[1]).toEqual({
        status: 'rejected',
        reason: new Error(
          'Failed to fetch sentinel network flags: 500 - Internal Server Error',
        ),
      });
      expect(results[2]).toEqual({
        status: 'rejected',
        reason: new Error(
          'Failed to fetch sentinel network flags: 500 - Internal Server Error',
        ),
      });

      // Only one fetch was made (concurrent deduplication worked)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('isSendBundleSupported', () => {
    const mainnetHex: Hex = '0x1';
    const polygonHex: Hex = '0x89';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns true if network supports sendBundle', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);
      const result = await isSendBundleSupported(mainnetHex);
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('returns false if sendBundle is false', async () => {
      const networksWithFalse = {
        ...MOCK_NETWORKS,
        '1': { ...MAINNET_BASE, sendBundle: false },
      };
      fetchMock.mockResolvedValueOnce({
        json: async () => networksWithFalse,
        ok: true,
      } as Response);
      const result = await isSendBundleSupported(mainnetHex);
      expect(result).toBe(false);
    });

    it('returns false if network is undefined', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({}),
        ok: true,
      } as Response);
      const result = await isSendBundleSupported('0xFAFA' as Hex);
      expect(result).toBe(false);
    });

    it('returns false if sendBundle is missing', async () => {
      const networksMissing = { ...MOCK_NETWORKS, '1': { ...MAINNET_BASE } };
      delete (networksMissing['1'] as unknown as { sendBundle?: boolean })
        .sendBundle;
      fetchMock.mockResolvedValueOnce({
        json: async () => networksMissing,
        ok: true,
      } as Response);
      const result = await isSendBundleSupported(mainnetHex);
      expect(result).toBe(false);
    });

    it('returns false for another network where sendBundle is false', async () => {
      fetchMock.mockResolvedValueOnce({
        json: async () => MOCK_NETWORKS,
        ok: true,
      } as Response);
      const result = await isSendBundleSupported(polygonHex);
      expect(result).toBe(false);
    });

    it('throws if the fetch fails', async () => {
      const mockError = 'API mock error';
      fetchMock.mockRejectedValueOnce(new Error(mockError));
      await expect(isSendBundleSupported(mainnetHex)).rejects.toThrow(
        mockError,
      );
    });
  });
});
