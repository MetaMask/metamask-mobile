import { waitFor } from '@testing-library/react-native';
import { useFetchPopularTokens } from './useFetchPopularTokens';
import { createMockPopularToken, MOCK_CHAIN_IDS } from '../testUtils/fixtures';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { initialState } from '../_mocks_/initialState';
import { popularTokensCache } from '../utils/cacheUtils';
import type { IncludeAsset } from '../types';

let globalFetchSpy: jest.SpyInstance;

const mockGetBearerToken = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: () => mockGetBearerToken(),
    },
  },
}));

const mockPopularTokens = [
  createMockPopularToken({ symbol: 'TEST', name: 'Test Token' }),
  createMockPopularToken({ symbol: 'ANOT', name: 'Another Token' }),
];

const mockIncludeAsset: IncludeAsset = {
  assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000123',
  decimals: 18,
  symbol: 'HELLO',
  name: 'Hello',
};

describe('useFetchPopularTokens', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockGetBearerToken.mockClear();
    mockGetBearerToken.mockResolvedValue('mock-bearer-token');
    globalFetchSpy = jest.spyOn(global, 'fetch');
    popularTokensCache.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('returns a stable callback that does not fetch on mount', () => {
    const { result } = renderHookWithProvider(() => useFetchPopularTokens(), {
      state: initialState,
    });

    expect(typeof result.current).toBe('function');
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it('fetches popular tokens when invoked and caches the result', async () => {
    globalFetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularTokens,
    });

    const { result } = renderHookWithProvider(() => useFetchPopularTokens(), {
      state: initialState,
    });

    const tokens = await result.current({
      chainIds: [MOCK_CHAIN_IDS.ethereum],
      includeAssets: [mockIncludeAsset],
    });

    expect(tokens).toStrictEqual(mockPopularTokens);
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
    expect(globalFetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/getTokens/popular'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: [mockIncludeAsset],
        }),
      }),
    );
    expect(popularTokensCache.size).toBe(1);
  });

  it('defaults includeAssets to an empty array when omitted', async () => {
    globalFetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularTokens,
    });

    const { result } = renderHookWithProvider(() => useFetchPopularTokens(), {
      state: initialState,
    });

    await result.current({ chainIds: [MOCK_CHAIN_IDS.ethereum] });

    expect(globalFetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
          includeAssets: [],
        }),
      }),
    );
  });

  it('returns cached data within TTL without re-fetching', async () => {
    globalFetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPopularTokens,
    });

    const { result } = renderHookWithProvider(() => useFetchPopularTokens(), {
      state: initialState,
    });

    await result.current({ chainIds: [MOCK_CHAIN_IDS.ethereum] });
    const cachedTokens = await result.current({
      chainIds: [MOCK_CHAIN_IDS.ethereum],
    });

    expect(cachedTokens).toStrictEqual(mockPopularTokens);
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
  });

  describe('bearer token retrieval on mount', () => {
    const bearerTokenOnMountCases = [
      {
        description:
          'does not retrieve a bearer token when basic functionality is disabled',
        state: {
          ...initialState,
          settings: { basicFunctionalityEnabled: false },
        },
        assertBearerUsage: async () => {
          await waitFor(() =>
            expect(mockGetBearerToken).not.toHaveBeenCalled(),
          );
        },
      },
      {
        description:
          'retrieves a bearer token on mount when basic functionality is enabled',
        state: initialState,
        assertBearerUsage: async () => {
          await waitFor(() => expect(mockGetBearerToken).toHaveBeenCalled());
        },
      },
    ];

    it.each(bearerTokenOnMountCases)(
      '$description',
      async ({ state, assertBearerUsage }) => {
        renderHookWithProvider(() => useFetchPopularTokens(), { state });
        await assertBearerUsage();
      },
    );
  });

  describe('when the fetch does not yield cacheable popular tokens', () => {
    const noCacheUndefinedResultCases = [
      {
        description: 'does not cache when the API returns an empty array',
        setupFetchMock: () => {
          globalFetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
          });
        },
      },
      {
        description:
          'does not cache when the API returns a malformed top-level payload',
        setupFetchMock: () => {
          globalFetchSpy.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: mockPopularTokens }),
          });
        },
      },
      {
        description: 'returns undefined when the response is not ok',
        setupFetchMock: () => {
          globalFetchSpy.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => mockPopularTokens,
          });
        },
      },
      {
        description:
          'returns undefined on AbortError without writing to the cache',
        setupFetchMock: () => {
          const abortError = new Error('aborted');
          abortError.name = 'AbortError';
          globalFetchSpy.mockRejectedValueOnce(abortError);
        },
      },
    ];

    it.each(noCacheUndefinedResultCases)(
      '$description',
      async ({ setupFetchMock }) => {
        setupFetchMock();

        const { result } = renderHookWithProvider(
          () => useFetchPopularTokens(),
          {
            state: initialState,
          },
        );

        const tokens = await result.current({
          chainIds: [MOCK_CHAIN_IDS.ethereum],
        });

        expect(tokens).toBeUndefined();
        expect(popularTokensCache.size).toBe(0);
      },
    );
  });

  it('uses different cache keys for different includeAssets', async () => {
    globalFetchSpy
      .mockResolvedValueOnce({ ok: true, json: async () => mockPopularTokens })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockPopularTokens[0]],
      });

    const { result } = renderHookWithProvider(() => useFetchPopularTokens(), {
      state: initialState,
    });

    await result.current({
      chainIds: [MOCK_CHAIN_IDS.ethereum],
      includeAssets: [],
    });
    await result.current({
      chainIds: [MOCK_CHAIN_IDS.ethereum],
      includeAssets: [mockIncludeAsset],
    });

    expect(globalFetchSpy).toHaveBeenCalledTimes(2);
    expect(popularTokensCache.size).toBe(2);
  });
});
