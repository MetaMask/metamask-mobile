import { renderHook, waitFor, act } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import { useSearchTokens } from './useSearchTokens';
import { useSwapsFeatureId } from './useSwapsFeatureId';
import {
  createMockPopularToken,
  createMockSearchResponse,
  createMockPaginatedResponse,
  MOCK_CHAIN_IDS,
} from '../testUtils/fixtures';
import { PopularToken } from '../types';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  type TraceContext,
  type TraceRequest,
} from '../../../../util/trace';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../util/test/analyticsMock';

global.fetch = jest.fn();

jest.mock('./useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

const mockUseSwapsFeatureId = jest.mocked(useSwapsFeatureId);
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: jest.fn().mockResolvedValue('mock-bearer-token'),
    },
  },
}));

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const mockTrace = trace as jest.MockedFunction<
  (request: TraceRequest) => TraceContext
>;
const mockEndTrace = jest.mocked(endTrace);

describe('useSearchTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseSwapsFeatureId.mockReturnValue(FeatureId.UNIFIED_SWAP_BRIDGE);
    mockCreateEventBuilder.mockImplementation(() => createMockEventBuilder());
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultParams = {
    chainIds: [MOCK_CHAIN_IDS.ethereum],
    includeAssets: [],
  };

  describe('initial state', () => {
    it('returns empty state on initialization', () => {
      const { result } = renderHook(() => useSearchTokens(defaultParams));

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearchLoading).toBe(false);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.searchCursor).toBeUndefined();
    });
  });

  describe('searching', () => {
    it('fetches search results when searchTokens is called', async () => {
      const mockResponse = createMockSearchResponse({
        data: [createMockPopularToken({ symbol: 'SRCH', isVerified: true })],
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test query');
      });

      await waitFor(() => expect(result.current.isSearchLoading).toBe(false));

      expect(result.current.searchResults).toEqual(mockResponse.data);
      expect((result.current.searchResults[0] as PopularToken).isVerified).toBe(
        true,
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/getTokens/search'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Initial fetch may not have a bearer token
            'Client-Version': expect.any(String),
            'X-Client-Id': 'mobile',
          },
          body: expect.stringContaining('test query'),
        }),
      );
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.SwapTokenSearch,
        op: TraceOperation.BridgeDataFetch,
        id: expect.any(String),
        data: {
          chain_scope: 'single_chain',
          query_length_bucket: '6-10',
        },
        startTime: expect.any(Number),
        tags: {
          feature: 'swap',
        },
      });
      const traceId = mockTrace.mock.calls[0][0].id;
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.SwapTokenSearch,
        id: traceId,
        timestamp: expect.any(Number),
        data: {
          result: 'success',
          result_count_bucket: '1-5',
        },
      });
    });

    it('does not trace empty queries', async () => {
      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('   ');
      });

      expect(mockTrace).not.toHaveBeenCalled();
      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('resets search when query is empty', async () => {
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      await waitFor(() =>
        expect(result.current.searchResults.length).toBeGreaterThan(0),
      );

      await act(async () => {
        await result.current.searchTokens('');
      });

      expect(result.current.searchResults).toEqual([]);
    });

    it('includes includeAssets in request body', async () => {
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const includeAssets = [
        {
          assetId: 'eip155:1/erc20:0xincluded' as const,
          name: 'Included Token',
          symbol: 'INC',
          decimals: 18,
        },
      ];

      const { result } = renderHook(() =>
        useSearchTokens({ ...defaultParams, includeAssets }),
      );

      await act(async () => {
        await result.current.searchTokens('test');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('includeAssets'),
        }),
      );
    });

    it('includes featureId in the request body when provided', async () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.RECURRING_ORDER);
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
      expect(JSON.parse(requestInit.body)).toMatchObject({
        featureId: FeatureId.RECURRING_ORDER,
      });
    });

    it('falls back to an empty array for malformed responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({
          pageInfo: {
            hasNextPage: false,
          },
        }),
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test query');
      });

      await waitFor(() => expect(result.current.isSearchLoading).toBe(false));

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searchCursor).toBeUndefined();
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            result: 'success',
            result_count_bucket: '0',
          }),
        }),
      );
    });
  });

  describe('debouncing', () => {
    it('debounces search calls', async () => {
      const mockResponse = createMockSearchResponse();
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      act(() => {
        result.current.debouncedSearch('test');
        result.current.debouncedSearch('test q');
        result.current.debouncedSearch('test qu');
        result.current.debouncedSearch('test query');
      });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() => expect(result.current.isSearchLoading).toBe(false));

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/getTokens/search'),
        expect.objectContaining({
          body: expect.stringContaining('test query'),
        }),
      );
      expect(mockTrace).toHaveBeenCalledTimes(1);
    });

    it('ignores queries below minimum length', async () => {
      const { result } = renderHook(() => useSearchTokens(defaultParams));

      act(() => {
        result.current.debouncedSearch('te');
      });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('handles pagination with cursor', async () => {
      const firstPage = createMockPaginatedResponse({
        data: [createMockPopularToken({ symbol: 'FIRST', isVerified: true })],
        cursor: 'cursor123',
      });
      const secondPage = createMockSearchResponse({
        data: [createMockPopularToken({ symbol: 'SECOND' })],
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => firstPage })
        .mockResolvedValueOnce({ json: async () => secondPage });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      await waitFor(() =>
        expect(result.current.searchCursor).toBe('cursor123'),
      );

      await act(async () => {
        await result.current.searchTokens('test', 'cursor123');
      });

      await waitFor(() => expect(result.current.searchResults.length).toBe(2));

      expect(result.current.searchResults[0].symbol).toBe('FIRST');
      expect(result.current.searchResults[1].symbol).toBe('SECOND');
      expect((result.current.searchResults[0] as PopularToken).isVerified).toBe(
        true,
      );
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
    });

    it('sets isLoadingMore for pagination requests', async () => {
      const firstPage = createMockPaginatedResponse();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => firstPage })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    json: async () => createMockSearchResponse(),
                  }),
                100,
              ),
            ),
        );

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      act(() => {
        result.current.searchTokens('test', 'cursor123');
      });

      await waitFor(() => expect(result.current.isLoadingMore).toBe(true));

      await act(async () => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    });
  });

  describe('reset', () => {
    it('resets search state on resetSearch call', async () => {
      const mockResponse = createMockPaginatedResponse();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test');
      });

      await waitFor(() =>
        expect(result.current.searchResults.length).toBeGreaterThan(0),
      );

      act(() => {
        result.current.resetSearch();
      });

      expect(result.current.searchResults).toEqual([]);
      expect(result.current.searchCursor).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('test query');
      });

      await waitFor(() => expect(result.current.isSearchLoading).toBe(false));

      expect(result.current.searchResults).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error searching tokens:',
        expect.any(Error),
      );
      expect(mockTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledTimes(1);
      expect(mockEndTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            result: 'error',
            result_count_bucket: '0',
          }),
        }),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('ADVANCED_ORDER_NO_ASSETS_FOUND', () => {
    const emptySearchResponse = createMockSearchResponse({ data: [] });

    const mockEmptySearchFetch = () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => emptySearchResponse,
      });
    };

    it('tracks after a successful empty fetch for a non-unified feature', async () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
      mockEmptySearchFetch();

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('nope');
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ADVANCED_ORDER_ASSET_SEARCH_EMPTY_RESULTS,
      );
      expect(
        mockCreateEventBuilder.mock.results[0].value.addProperties,
      ).toHaveBeenCalledWith({
        feature_id: FeatureId.LIMIT_ORDER,
        query: 'nope',
        location: 'Main View',
      });
    });

    it('does not track before the debounce delay elapses', () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
      mockEmptySearchFetch();

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      act(() => {
        result.current.debouncedSearch('nope');
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tracks after the debounced search fetch returns no results', async () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
      mockEmptySearchFetch();

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      act(() => {
        result.current.debouncedSearch('no');
        result.current.debouncedSearch('nop');
        result.current.debouncedSearch('nope');
      });

      expect(global.fetch).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ADVANCED_ORDER_ASSET_SEARCH_EMPTY_RESULTS,
      );
    });

    it('does not track when the debounced query is below the minimum length', async () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
      mockEmptySearchFetch();

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      act(() => {
        result.current.debouncedSearch('ab');
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track empty results for UNIFIED_SWAP_BRIDGE', async () => {
      mockEmptySearchFetch();

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('nope');
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track when the fetch returns tokens', async () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => createMockSearchResponse(),
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('eth');
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track when the fetch rejects', async () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('nope');
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('does not track when the fetch returns a non-ok status', async () => {
      mockUseSwapsFeatureId.mockReturnValue(FeatureId.LIMIT_ORDER);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useSearchTokens(defaultParams));

      await act(async () => {
        await result.current.searchTokens('nope');
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
