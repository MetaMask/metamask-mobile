import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  endTrace,
  getPerformanceTimestamp,
  setTraceMeasurement,
  trace,
} from '../../../../util/trace';
import { v4 as uuidv4 } from 'uuid';
import { useExploreSearchPerformance } from './useExploreSearchPerformance';

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('../../../../util/trace', () => ({
  endTrace: jest.fn(),
  getPerformanceTimestamp: jest.fn(),
  setTraceMeasurement: jest.fn(),
  trace: jest.fn(),
  TraceName: {
    ExploreSearchQuery: 'Explore Search Query',
  },
  TraceOperation: {
    ExploreSearch: 'explore.search',
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockGetPerformanceTimestamp = jest.mocked(getPerformanceTimestamp);
const mockUuidv4 = jest.mocked(uuidv4) as unknown as jest.Mock<string, []>;
const mockSetTraceMeasurement = jest.mocked(setTraceMeasurement);
const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);

const enabledFeeds = ['tokens', 'stocks', 'predictions'] as const;
const originalRequestAnimationFrame = global.requestAnimationFrame;
const originalCancelAnimationFrame = global.cancelAnimationFrame;

describe('useExploreSearchPerformance', () => {
  let now = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    now = 0;
    let uuidCount = 0;
    mockUuidv4.mockImplementation(() => {
      uuidCount += 1;
      return uuidCount === 1 ? 'search-trace-id' : `request-${uuidCount}`;
    });
    mockGetPerformanceTimestamp.mockImplementation(() => now);
    mockGetHardwareTier.mockReturnValue('MID');
    mockUseNetworkTier.mockReturnValue('WIFI');
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
    global.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('records query timing, request timing, feed readiness, and device context', () => {
    const { result, rerender } = renderHook(
      ({ query, isDebouncing }: { query: string; isDebouncing: boolean }) =>
        useExploreSearchPerformance({
          query,
          isDebouncing,
          enabledFeeds: [...enabledFeeds],
        }),
      {
        initialProps: { query: 'eth', isDebouncing: true },
      },
    );

    expect(mockTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'search-trace-id',
        startTime: 0,
        forceTransaction: true,
        maxLifetimeMs: 10_000,
        tags: {
          feature: 'explore_search',
          hardware_tier: 'MID',
          network_tier: 'WIFI',
        },
        data: expect.objectContaining({
          debounce_configured_ms: 200,
        }),
      }),
    );

    now = 200;
    rerender({ query: 'eth', isDebouncing: false });

    const request = result.current.tokens.startRequest('eth');
    expect(request).toBeDefined();
    result.current.stocks.markCachedResult?.('eth');
    result.current.predictions.markCachedResult?.('eth');

    now = 350;
    act(() => {
      request?.end('success');
    });

    now = 400;
    act(() => {
      result.current.markFeedReady('tokens', true, 2);
      result.current.markFeedReady('stocks', true, 1);
      result.current.markFeedReady('predictions', true, 3);
    });

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.debounce_ms',
      200,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.debounce_configured_ms',
      200,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.debounce_overhead_ms',
      0,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.request.tokens.ms',
      150,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.request_to_ready_ms',
      50,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.ready_from_last_input_ms',
      400,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.request_to_painted_ms',
      50,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.painted_ms',
      400,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.painted_from_last_input_ms',
      400,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.last_input_to_end_ms',
      400,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).not.toHaveBeenCalledWith(
      expect.anything(),
      'search.first_input_to_results_ms',
      expect.anything(),
      'millisecond',
    );
    expect(mockSetTraceMeasurement).not.toHaveBeenCalledWith(
      expect.anything(),
      'search.feed.tokens.request_to_commit_ms',
      expect.anything(),
      'millisecond',
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Explore Search Query',
        id: 'search-trace-id',
        timestamp: 400,
        data: expect.objectContaining({
          success: true,
          content_state: 'results',
          result_count: 6,
          input_count: 1,
          collapsed_input_count: 0,
          tokens_search_mode: 'network',
          stocks_search_mode: 'cache',
          predictions_search_mode: 'cache',
        }),
      }),
    );
  });

  it('calculates request-to-painted time from absolute timestamps', () => {
    now = 100;
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );
    now = 200;
    const request = result.current.tokens.startRequest('eth');

    now = 350;
    act(() => {
      request?.end('success');
    });

    now = 400;
    act(() => {
      result.current.markFeedReady('tokens', true, 1);
    });

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.request_to_painted_ms',
      50,
      'millisecond',
    );
  });

  it('aggregates retry attempts into one final successful request outcome', () => {
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );

    now = 10;
    const firstRequest = result.current.tokens.startRequest('eth');
    now = 20;
    act(() => {
      firstRequest?.end('error');
    });

    now = 120;
    const secondRequest = result.current.tokens.startRequest('eth');
    now = 150;
    act(() => {
      secondRequest?.end('success');
      result.current.markFeedReady('tokens', true, 1);
    });

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.request.tokens.attempt_count',
      2,
      'none',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.request.tokens.ms',
      140,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.error_count',
      0,
      'none',
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
        }),
      }),
    );
  });

  it('reports one final error after all retry attempts fail', () => {
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );

    [10, 110, 210].forEach((startedAt) => {
      now = startedAt;
      const request = result.current.tokens.startRequest('eth');
      now = startedAt + 10;
      act(() => {
        request?.end('error');
      });
    });

    now = 230;
    act(() => {
      result.current.markFeedReady('tokens', true, 0);
    });

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.request.tokens.attempt_count',
      3,
      'none',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.request.tokens.ms',
      210,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.error_count',
      1,
      'none',
    );
    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          content_state: 'error',
        }),
      }),
    );
  });

  it('separates configured debounce delay from observed settle latency', () => {
    const { rerender } = renderHook(
      ({ isDebouncing }: { isDebouncing: boolean }) =>
        useExploreSearchPerformance({
          query: 'eth',
          isDebouncing,
          enabledFeeds: [...enabledFeeds],
        }),
      { initialProps: { isDebouncing: true } },
    );

    now = 331;
    rerender({ isDebouncing: false });

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.debounce_ms',
      331,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.debounce_configured_ms',
      200,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.debounce_overhead_ms',
      131,
      'millisecond',
    );
  });

  it('waits for two animation frames before completing the measurement', () => {
    const frameCallbacks: ((timestamp: number) => void)[] = [];
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );
    const request = result.current.tokens.startRequest('eth');

    act(() => {
      request?.end('success');
      result.current.markFeedReady('tokens', true, 2);
    });

    expect(mockEndTrace).not.toHaveBeenCalled();

    act(() => {
      frameCallbacks.shift()?.(0);
    });
    expect(mockEndTrace).not.toHaveBeenCalled();

    act(() => {
      frameCallbacks.shift()?.(0);
    });
    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('finishes the trace when Search loses focus', () => {
    const frameCallbacks: ((timestamp: number) => void)[] = [];
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
        isFocused: true,
      }),
    );
    const request = result.current.tokens.startRequest('eth');

    act(() => {
      request?.end('success');
      result.current.markFeedReady('tokens', true, 2);
    });

    act(() => {
      result.current.onBlur();
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: 'blurred',
          success: false,
        }),
      }),
    );
    act(() => {
      frameCallbacks.shift()?.(0);
    });
    expect(mockEndTrace).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.onFocus();
    });
    expect(mockTrace).toHaveBeenCalledTimes(2);
  });

  it('distinguishes inactive interruptions from backgrounding', () => {
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );
    const appStateChangeHandler = (AppState.addEventListener as jest.Mock).mock
      .calls[0][1] as (nextState: 'inactive' | 'background') => void;

    act(() => {
      appStateChangeHandler('inactive');
    });

    expect(mockEndTrace).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          reason: 'inactive',
        }),
      }),
    );

    act(() => {
      result.current.onFocus();
      appStateChangeHandler('background');
    });

    expect(mockEndTrace).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          reason: 'backgrounded',
        }),
      }),
    );
  });

  it('completes a trace when the request query is normalized', () => {
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: '$laptop',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );
    const request = result.current.tokens.startRequest('laptop');

    act(() => {
      request?.end('success');
      result.current.markFeedReady('tokens', true, 1);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
        }),
      }),
    );
  });

  it('cancels pending paint completion when the query changes', () => {
    const frameCallbacks: ((timestamp: number) => void)[] = [];
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useExploreSearchPerformance({
          query,
          isDebouncing: false,
          enabledFeeds: ['tokens'],
        }),
      { initialProps: { query: 'eth' } },
    );
    const request = result.current.tokens.startRequest('eth');

    act(() => {
      request?.end('success');
      result.current.markFeedReady('tokens', true, 1);
    });

    rerender({ query: 'btc' });
    const endTraceCallCount = mockEndTrace.mock.calls.length;
    act(() => {
      frameCallbacks.shift()?.(0);
    });

    expect(global.cancelAnimationFrame).toHaveBeenCalled();
    expect(mockEndTrace).toHaveBeenCalledTimes(endTraceCallCount);
  });

  it('cancels pending paint completion when unmounted', () => {
    const frameCallbacks: ((timestamp: number) => void)[] = [];
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    const { result, unmount } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );
    const request = result.current.tokens.startRequest('eth');

    act(() => {
      request?.end('success');
      result.current.markFeedReady('tokens', true, 1);
    });

    unmount();
    const endTraceCallCount = mockEndTrace.mock.calls.length;
    act(() => {
      frameCallbacks.shift()?.(0);
    });

    expect(global.cancelAnimationFrame).toHaveBeenCalled();
    expect(mockEndTrace).toHaveBeenCalledTimes(endTraceCallCount);
  });

  it('reports a failed trace when all feeds settle with an error', () => {
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens'],
      }),
    );
    const request = result.current.tokens.startRequest('eth');

    act(() => {
      request?.end('error');
      result.current.markFeedReady('tokens', true, 0);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          content_state: 'error',
        }),
      }),
    );
  });

  it('reports partial errors as an unsuccessful completed trace', () => {
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: ['tokens', 'stocks'],
      }),
    );
    const request = result.current.tokens.startRequest('eth');

    act(() => {
      result.current.stocks.markCachedResult?.('eth');
      request?.end('error');
      result.current.markFeedReady('tokens', true, 0);
      result.current.markFeedReady('stocks', true, 2);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          content_state: 'partial_error',
          result_count: 2,
        }),
      }),
    );
  });

  it('ignores query feed readiness until its request settles', () => {
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: [...enabledFeeds],
      }),
    );

    act(() => {
      result.current.markFeedReady('tokens', true, 100);
      result.current.markFeedReady('stocks', true, 100);
      result.current.markFeedReady('predictions', true, 100);
    });

    expect(mockEndTrace).not.toHaveBeenCalled();

    const tokenRequest = result.current.tokens.startRequest('eth');
    const stocksRequest = result.current.stocks.startRequest('eth');
    const predictionsRequest = result.current.predictions.startRequest('eth');

    act(() => {
      result.current.markFeedReady('tokens', true, 100);
      result.current.markFeedReady('stocks', true, 100);
      result.current.markFeedReady('predictions', true, 100);
    });

    expect(mockEndTrace).not.toHaveBeenCalled();

    now = 100;
    act(() => {
      tokenRequest?.end('success');
      stocksRequest?.end('success');
      predictionsRequest?.end('success');
      result.current.markFeedReady('tokens', true, 2);
      result.current.markFeedReady('stocks', true, 1);
      result.current.markFeedReady('predictions', true, 3);
    });

    expect(mockEndTrace).toHaveBeenCalledTimes(1);
  });

  it('labels locally filtered feed readiness as local_filter', () => {
    const allEnabledFeeds = [
      'tokens',
      'perps',
      'earn',
      'stocks',
      'predictions',
      'sites',
    ] as const;
    const { result } = renderHook(() =>
      useExploreSearchPerformance({
        query: 'eth',
        isDebouncing: false,
        enabledFeeds: [...allEnabledFeeds],
      }),
    );

    act(() => {
      result.current.tokens.markCachedResult?.('eth');
      result.current.stocks.markCachedResult?.('eth');
      result.current.predictions.markCachedResult?.('eth');
      result.current.markFeedReady('tokens', true, 1);
      result.current.markFeedReady('perps', true, 1);
      result.current.markFeedReady('earn', true, 1);
      result.current.markFeedReady('stocks', true, 1);
      result.current.markFeedReady('predictions', true, 1);
      result.current.markFeedReady('sites', true, 1);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          perps_search_mode: 'local_filter',
          earn_search_mode: 'local_filter',
          sites_search_mode: 'local_filter',
        }),
      }),
    );
  });

  it('collapses rapid typeahead input into one measurement generation', () => {
    const { result, rerender } = renderHook(
      ({ query, isDebouncing }: { query: string; isDebouncing: boolean }) =>
        useExploreSearchPerformance({
          query,
          isDebouncing,
          enabledFeeds: [...enabledFeeds],
        }),
      {
        initialProps: { query: 'e', isDebouncing: true },
      },
    );

    now = 20;
    rerender({ query: 'et', isDebouncing: true });
    now = 40;
    rerender({ query: 'eth', isDebouncing: true });
    now = 240;
    rerender({ query: 'eth', isDebouncing: false });

    act(() => {
      result.current.tokens.markCachedResult?.('eth');
      result.current.stocks.markCachedResult?.('eth');
      result.current.predictions.markCachedResult?.('eth');
      result.current.markFeedReady('tokens', true, 1);
      result.current.markFeedReady('stocks', true, 0);
      result.current.markFeedReady('predictions', true, 0);
    });

    expect(mockEndTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          input_count: 3,
          collapsed_input_count: 2,
        }),
      }),
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.ready_from_last_input_ms',
      200,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.feed.tokens.painted_from_last_input_ms',
      200,
      'millisecond',
    );
    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.last_input_to_end_ms',
      200,
      'millisecond',
    );
  });

  it('counts an earlier request as superseded when the query changes', () => {
    const { result, rerender } = renderHook(
      ({ query, isDebouncing }: { query: string; isDebouncing: boolean }) =>
        useExploreSearchPerformance({
          query,
          isDebouncing,
          enabledFeeds: [...enabledFeeds],
        }),
      {
        initialProps: { query: 'e', isDebouncing: false },
      },
    );

    const request = result.current.tokens.startRequest('e');

    now = 50;
    rerender({ query: 'eth', isDebouncing: true });
    now = 250;
    rerender({ query: 'eth', isDebouncing: false });
    const currentRequest = result.current.tokens.startRequest('eth');
    result.current.stocks.markCachedResult?.('eth');
    result.current.predictions.markCachedResult?.('eth');

    act(() => {
      request?.end('success');
      currentRequest?.end('success');
      result.current.markFeedReady('tokens', true, 1);
      result.current.markFeedReady('stocks', true, 0);
      result.current.markFeedReady('predictions', true, 0);
    });

    expect(mockSetTraceMeasurement).toHaveBeenCalledWith(
      { name: 'Explore Search Query', id: 'search-trace-id' },
      'search.superseded_request_count',
      1,
      'none',
    );
  });
});
