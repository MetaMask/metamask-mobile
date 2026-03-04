import { waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import initialRootState from '../../../../util/test/initial-root-state';
import { handleFetch } from '@metamask/controller-utils';
import {
  useRampTokens,
  RampsToken,
  __clearRampTokensCache,
} from './useRampTokens';
import { UnifiedRampRoutingType } from '../../../../reducers/fiatOrders';
import Logger from '../../../../util/Logger';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

// Mock network configurations for the selector
const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [],
  },
  'eip155:137': {
    chainId: '0x89',
    name: 'Polygon',
    nativeCurrency: 'POL',
    rpcEndpoints: [],
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    name: 'Solana',
    nativeCurrency: 'SOL',
    rpcEndpoints: [],
  },
  'bip122:000000000019d6689c085ae165831e93': {
    chainId: 'bip122:000000000019d6689c085ae165831e93',
    name: 'Bitcoin',
    nativeCurrency: 'BTC',
    rpcEndpoints: [],
  },
  'tron:728126428': {
    chainId: 'tron:728126428',
    name: 'TRON',
    nativeCurrency: 'TRX',
    rpcEndpoints: [],
  },
};

jest.mock('../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../selectors/networkController'),
  selectNetworkConfigurationsByCaipChainId: () => mockNetworkConfigurations,
}));

const mockHandleFetch = handleFetch as jest.MockedFunction<typeof handleFetch>;
const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;

const createMockToken = (overrides = {}): RampsToken => ({
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  iconUrl: 'https://example.com/eth.png',
  tokenSupported: true,
  ...overrides,
});

const createMockResponse = (
  topTokens: RampsToken[],
  allTokens: RampsToken[],
) => ({
  topTokens,
  allTokens,
});

const createMockState = (
  rampRoutingDecision: UnifiedRampRoutingType | null = null,
  detectedGeolocation?: string,
) => ({
  ...initialRootState,
  fiatOrders: {
    ...initialRootState.fiatOrders,
    rampRoutingDecision,
    detectedGeolocation,
  },
});

describe('useRampTokens', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  beforeEach(() => {
    __clearRampTokensCache();
    jest.clearAllMocks();
    process.env.METAMASK_ENVIRONMENT = 'dev';
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  describe('fetches tokens with correct parameters', () => {
    it('fetches tokens for AGGREGATOR routing decision', async () => {
      const mockTopTokens = [
        createMockToken(),
        createMockToken({ symbol: 'BTC' }),
      ];
      const mockAllTokens = [
        ...mockTopTokens,
        createMockToken({
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          symbol: 'SOL',
          tokenSupported: false,
          assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        }),
      ];
      const mockResponse = createMockResponse(mockTopTokens, mockAllTokens);
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });

      expect(result.current.topTokens).toEqual(mockTopTokens);
      expect(result.current.allTokens).toEqual(mockAllTokens);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('fetches tokens for DEPOSIT routing decision', async () => {
      const mockTopTokens = [createMockToken()];
      const mockAllTokens = [
        ...mockTopTokens,
        createMockToken({ symbol: 'USDC' }),
      ];
      const mockResponse = createMockResponse(mockTopTokens, mockAllTokens);
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'uk'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/uk/tokens?action=deposit&sdk=2.1.5',
        );
      });

      expect(result.current.topTokens).toEqual(mockTopTokens);
      expect(result.current.allTokens).toEqual(mockAllTokens);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('includes SDK version in query parameters', async () => {
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalled();
      });

      const calledUrl = mockHandleFetch.mock.calls[0][0];
      expect(calledUrl).toContain('sdk=2.1.5');
    });
  });

  describe('fetchOnMount option', () => {
    it('skips fetching tokens when fetchOnMount is false', () => {
      const mockResponse = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(
        () => useRampTokens({ fetchOnMount: false }),
        {
          state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
        },
      );

      expect(result.current.topTokens).toBeNull();
      expect(result.current.allTokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });
  });

  describe('environment-based URL selection', () => {
    it('uses production URL for production environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });

    it('uses production URL for beta environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.api.cx.metamask.io/regions/us-ca/tokens?action=deposit&sdk=2.1.5',
        );
      });
    });

    it('uses production URL for rc environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for dev environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=deposit&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for exp environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for test environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=deposit&sdk=2.1.5',
        );
      });
    });

    it('uses staging URL for e2e environment', async () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledWith(
          'https://on-ramp-cache.uat-api.cx.metamask.io/regions/us-ca/tokens?action=buy&sdk=2.1.5',
        );
      });
    });
  });

  describe('returns null for invalid scenarios', () => {
    it('returns null when no region detected', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR),
      });

      expect(result.current.topTokens).toBeNull();
      expect(result.current.allTokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });

    it('returns null for UNSUPPORTED routing decision', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.UNSUPPORTED, 'us-ca'),
      });

      expect(result.current.topTokens).toBeNull();
      expect(result.current.allTokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });

    it('returns null for ERROR routing decision', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.ERROR, 'us-ca'),
      });

      expect(result.current.topTokens).toBeNull();
      expect(result.current.allTokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });

    it('returns null for null routing decision', () => {
      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(null, 'us-ca'),
      });

      expect(result.current.topTokens).toBeNull();
      expect(result.current.allTokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockHandleFetch).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('sets error state when fetch fails', async () => {
      const mockError = new Error('Network error');
      mockHandleFetch.mockRejectedValueOnce(mockError);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      expect(result.current.topTokens).toBeNull();
      expect(result.current.allTokens).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('logs error when fetch fails', async () => {
      const mockError = new Error('API error');
      mockHandleFetch.mockRejectedValueOnce(mockError);

      renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          mockError,
          'useRampTokens::fetchTokens failed',
        );
      });
    });

    it('clears error at start of new fetch attempt', async () => {
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
        // Error should be null WHILE loading is true
        expect(result.current.error).toBeNull();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.topTokens).toEqual(mockResponse.topTokens);
      expect(result.current.allTokens).toEqual(mockResponse.allTokens);
    });
  });

  describe('loading state', () => {
    it('sets loading to false after successful fetch', async () => {
      const mockResponse = createMockResponse(
        [createMockToken()],
        [createMockToken()],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.topTokens).toEqual(mockResponse.topTokens);
      expect(result.current.allTokens).toEqual(mockResponse.allTokens);
    });

    it('sets loading to false after failed fetch', async () => {
      const mockError = new Error('Fetch error');
      mockHandleFetch.mockRejectedValueOnce(mockError);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('returns correct token data structure', () => {
    it('returns both topTokens and allTokens with tokenSupported field', async () => {
      const mockTopTokens = [
        createMockToken({ tokenSupported: true }),
        createMockToken({ symbol: 'BTC', tokenSupported: true }),
      ];
      const mockAllTokens = [
        ...mockTopTokens,
        createMockToken({ symbol: 'USDC', tokenSupported: false }),
        createMockToken({
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          symbol: 'SOL',
          tokenSupported: false,
          assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        }),
      ];
      const mockResponse = createMockResponse(mockTopTokens, mockAllTokens);
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.topTokens).toEqual(mockTopTokens);
      });

      // All 4 tokens pass network filter (ETH, BTC, USDC on eip155:1, SOL on solana)
      expect(result.current.allTokens).toHaveLength(4);
      expect(result.current.topTokens?.[0].tokenSupported).toBe(true);
      expect(result.current.topTokens?.[1].tokenSupported).toBe(true);
      expect(result.current.allTokens?.[2].tokenSupported).toBe(false);
      expect(result.current.allTokens?.[3].tokenSupported).toBe(false);
    });
  });

  describe('network filtering', () => {
    it('filters tokens based on user networks in wallet', async () => {
      // Create tokens for networks that exist in mockNetworkConfigurations
      const ethToken = createMockToken({ symbol: 'ETH' });
      const solToken = createMockToken({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        symbol: 'SOL',
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      });
      const btcToken = createMockToken({
        chainId: 'bip122:000000000019d6689c085ae165831e93',
        symbol: 'BTC',
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      });

      const mockResponse = createMockResponse(
        [ethToken, solToken],
        [ethToken, solToken, btcToken],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.topTokens).toBeDefined();
      });

      // All networks from mock config are in the user's wallet
      expect(result.current.topTokens).toHaveLength(2);
      expect(result.current.allTokens).toHaveLength(3);
    });

    it('filters out tokens with empty chainId', async () => {
      const ethToken = createMockToken({ symbol: 'ETH' });
      const invalidToken = createMockToken({
        chainId: '' as `${string}:${string}`,
        symbol: 'INVALID',
        assetId: 'invalid:token',
      });

      const mockResponse = createMockResponse(
        [ethToken, invalidToken],
        [ethToken, invalidToken],
      );
      mockHandleFetch.mockResolvedValueOnce(mockResponse);

      const { result } = renderHookWithProvider(() => useRampTokens(), {
        state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
      });

      await waitFor(() => {
        expect(result.current.topTokens).toBeDefined();
      });

      // Should exclude token with empty chainId
      expect(result.current.topTokens).toHaveLength(1);
      expect(result.current.topTokens?.[0].symbol).toBe('ETH');
      expect(result.current.allTokens).toHaveLength(1);
    });
  });

  describe('tokens cache', () => {
    it('returns cached result on second mount with same region and routing (no second fetch)', async () => {
      const mockResponse = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      mockHandleFetch.mockResolvedValue(mockResponse);

      const state = createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca');
      const { result: result1, unmount: unmount1 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result1.current.topTokens).toEqual(mockResponse.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);

      unmount1();

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result2.current.topTokens).toEqual(mockResponse.topTokens);
      });

      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    });

    it('deduplicates in-flight requests when two hooks share same region and routing', async () => {
      type MockResponse = ReturnType<typeof createMockResponse>;
      const deferred: { resolve: (value: MockResponse) => void } = {
        resolve: jest.fn(),
      };
      const fetchPromise = new Promise<MockResponse>((resolve) => {
        deferred.resolve = resolve;
      });
      mockHandleFetch.mockReturnValue(fetchPromise);

      const mockResponse = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      const state = createMockState(UnifiedRampRoutingType.DEPOSIT, 'uk');

      const { result: result1 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state,
        },
      );

      await waitFor(() => {
        expect(mockHandleFetch).toHaveBeenCalledTimes(1);
      });

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state,
        },
      );

      deferred.resolve(mockResponse);

      await waitFor(() => {
        expect(result1.current.topTokens).toEqual(mockResponse.topTokens);
        expect(result2.current.topTokens).toEqual(mockResponse.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    });

    it('fetches separately for different routing decision (different cache key)', async () => {
      const responseAgg = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      const responseDep = createMockResponse(
        [createMockToken({ symbol: 'BTC' })],
        [createMockToken({ symbol: 'BTC' })],
      );
      mockHandleFetch
        .mockResolvedValueOnce(responseAgg)
        .mockResolvedValueOnce(responseDep);

      const { result: result1, unmount: unmount1 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
        },
      );

      await waitFor(() => {
        expect(result1.current.topTokens).toEqual(responseAgg.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
      unmount1();

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state: createMockState(UnifiedRampRoutingType.DEPOSIT, 'us-ca'),
        },
      );

      await waitFor(() => {
        expect(result2.current.topTokens).toEqual(responseDep.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(2);
    });

    it('fetches separately for different region (different cache key)', async () => {
      const responseUs = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      const responseUk = createMockResponse(
        [createMockToken({ symbol: 'BTC' })],
        [createMockToken({ symbol: 'BTC' })],
      );
      mockHandleFetch
        .mockResolvedValueOnce(responseUs)
        .mockResolvedValueOnce(responseUk);

      const { result: result1, unmount: unmount1 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
        },
      );

      await waitFor(() => {
        expect(result1.current.topTokens).toEqual(responseUs.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
      unmount1();

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'uk'),
        },
      );

      await waitFor(() => {
        expect(result2.current.topTokens).toEqual(responseUk.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(2);
    });

    it('refetches when cache entry is expired (TTL exceeded)', async () => {
      jest.useFakeTimers();
      const response1 = createMockResponse(
        [createMockToken({ symbol: 'A' })],
        [createMockToken({ symbol: 'A' })],
      );
      const response2 = createMockResponse(
        [createMockToken({ symbol: 'B' })],
        [createMockToken({ symbol: 'B' })],
      );
      mockHandleFetch
        .mockResolvedValueOnce(response1)
        .mockResolvedValueOnce(response2);

      const state = createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca');
      const { result: result1, unmount: unmount1 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result1.current.topTokens).toEqual(response1.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      unmount1();

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result2.current.topTokens).toEqual(response2.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('deletes cache entry on fetch error and refetches on next mount', async () => {
      const mockError = new Error('Network error');
      const mockResponse = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      mockHandleFetch
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      const state = createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca');
      const { result: result1, unmount: unmount1 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result1.current.error).toEqual(mockError);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
      unmount1();

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result2.current.topTokens).toEqual(mockResponse.topTokens);
        expect(result2.current.error).toBeNull();
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(2);
    });

    it('refetches after __clearRampTokensCache when same params are used again', async () => {
      const mockResponse = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      mockHandleFetch.mockResolvedValue(mockResponse);

      const state = createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca');
      const { result: result1, unmount: unmount1 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result1.current.topTokens).toEqual(mockResponse.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);

      unmount1();
      __clearRampTokensCache();

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        { state },
      );

      await waitFor(() => {
        expect(result2.current.topTokens).toEqual(mockResponse.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(2);
    });

    it('uses same cache key for same region regardless of case (normalizes to lowercase)', async () => {
      const mockResponse = createMockResponse(
        [createMockToken({ symbol: 'ETH' })],
        [createMockToken({ symbol: 'ETH' })],
      );
      mockHandleFetch.mockResolvedValue(mockResponse);

      const { result: result1, unmount: unmount1 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'US-CA'),
        },
      );

      await waitFor(() => {
        expect(result1.current.topTokens).toEqual(mockResponse.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
      unmount1();

      const { result: result2 } = renderHookWithProvider(
        () => useRampTokens(),
        {
          state: createMockState(UnifiedRampRoutingType.AGGREGATOR, 'us-ca'),
        },
      );

      await waitFor(() => {
        expect(result2.current.topTokens).toEqual(mockResponse.topTokens);
      });
      expect(mockHandleFetch).toHaveBeenCalledTimes(1);
    });
  });
});
