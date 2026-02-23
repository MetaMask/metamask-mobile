import { renderHook, act } from '@testing-library/react-hooks';
import { useSearchTracking } from './useSearchTracking';
import TrendingFeedSessionManager from '../../services/TrendingFeedSessionManager';

// Mock the TrendingFeedSessionManager
jest.mock('../../services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

describe('useSearchTracking', () => {
  const mockTrackSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (TrendingFeedSessionManager.getInstance as jest.Mock).mockReturnValue({
      trackSearch: mockTrackSearch,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultProps = {
    searchQuery: '',
    resultsCount: 0,
    isLoading: false,
    timeFilter: '24h',
    sortOption: 'price_change',
    networkFilter: 'all',
  };

  it('does not track when search query is empty', () => {
    renderHook(() =>
      useSearchTracking({
        ...defaultProps,
        searchQuery: '',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).not.toHaveBeenCalled();
  });

  it('does not track when results are loading', () => {
    renderHook(() =>
      useSearchTracking({
        ...defaultProps,
        searchQuery: 'ethereum',
        isLoading: true,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).not.toHaveBeenCalled();
  });

  it('tracks search after debounce when query is non-empty and not loading', () => {
    renderHook(() =>
      useSearchTracking({
        ...defaultProps,
        searchQuery: 'ethereum',
        resultsCount: 5,
        isLoading: false,
      }),
    );

    // Should not track immediately
    expect(mockTrackSearch).not.toHaveBeenCalled();

    // Advance timers past debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).toHaveBeenCalledTimes(1);
    expect(mockTrackSearch).toHaveBeenCalledWith({
      search_query: 'ethereum',
      results_count: 5,
      has_results: true,
      time_filter: '24h',
      sort_option: 'price_change',
      network_filter: 'all',
    });
  });

  it('tracks has_results as false when resultsCount is 0', () => {
    renderHook(() =>
      useSearchTracking({
        ...defaultProps,
        searchQuery: 'nonexistent',
        resultsCount: 0,
        isLoading: false,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        search_query: 'nonexistent',
        results_count: 0,
        has_results: false,
      }),
    );
  });

  it('does not track the same query twice', () => {
    const { rerender } = renderHook((props) => useSearchTracking(props), {
      initialProps: {
        ...defaultProps,
        searchQuery: 'bitcoin',
        resultsCount: 3,
      },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).toHaveBeenCalledTimes(1);

    // Rerender with same query
    rerender({ ...defaultProps, searchQuery: 'bitcoin', resultsCount: 3 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should still be 1 (not tracked again)
    expect(mockTrackSearch).toHaveBeenCalledTimes(1);
  });

  it('tracks when query changes', () => {
    const { rerender } = renderHook((props) => useSearchTracking(props), {
      initialProps: {
        ...defaultProps,
        searchQuery: 'bitcoin',
        resultsCount: 3,
      },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).toHaveBeenCalledTimes(1);

    // Rerender with different query
    rerender({ ...defaultProps, searchQuery: 'ethereum', resultsCount: 5 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).toHaveBeenCalledTimes(2);
    expect(mockTrackSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search_query: 'ethereum',
        results_count: 5,
      }),
    );
  });

  it('debounces rapid query changes', () => {
    const { rerender } = renderHook((props) => useSearchTracking(props), {
      initialProps: { ...defaultProps, searchQuery: 'e', resultsCount: 10 },
    });

    // Simulate rapid typing
    rerender({ ...defaultProps, searchQuery: 'et', resultsCount: 8 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ ...defaultProps, searchQuery: 'eth', resultsCount: 5 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ ...defaultProps, searchQuery: 'ethe', resultsCount: 3 });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should not have tracked yet (still within debounce)
    expect(mockTrackSearch).not.toHaveBeenCalled();

    // Complete the debounce
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should only track the final query
    expect(mockTrackSearch).toHaveBeenCalledTimes(1);
    expect(mockTrackSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        search_query: 'ethe',
        results_count: 3,
      }),
    );
  });

  it('resets tracking when search is cleared', () => {
    const { rerender } = renderHook((props) => useSearchTracking(props), {
      initialProps: {
        ...defaultProps,
        searchQuery: 'bitcoin',
        resultsCount: 3,
      },
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).toHaveBeenCalledTimes(1);

    // Clear search
    rerender({ ...defaultProps, searchQuery: '', resultsCount: 0 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should not track empty query
    expect(mockTrackSearch).toHaveBeenCalledTimes(1);

    // Search again with same query
    rerender({ ...defaultProps, searchQuery: 'bitcoin', resultsCount: 3 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should track again after clearing
    expect(mockTrackSearch).toHaveBeenCalledTimes(2);
  });

  it('passes all filter values correctly', () => {
    renderHook(() =>
      useSearchTracking({
        searchQuery: 'test',
        resultsCount: 10,
        isLoading: false,
        timeFilter: '7d',
        sortOption: 'volume',
        networkFilter: '0x1',
      }),
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockTrackSearch).toHaveBeenCalledWith({
      search_query: 'test',
      results_count: 10,
      has_results: true,
      time_filter: '7d',
      sort_option: 'volume',
      network_filter: '0x1',
    });
  });
});
