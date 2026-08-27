import { renderHook, waitFor } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { WatchlistAnalytics } from '../constants/watchlistAnalytics';
import useTrackWatchlistPageViewed from './useTrackWatchlistPageViewed';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'mock' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('useTrackWatchlistPageViewed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not track while loading', () => {
    renderHook(() =>
      useTrackWatchlistPageViewed({
        tokenCount: 0,
        isEmpty: true,
        isLoading: true,
      }),
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks once after loading completes with default v1 properties', async () => {
    const { rerender } = renderHook(
      ({ isLoading }) =>
        useTrackWatchlistPageViewed({
          tokenCount: 2,
          isEmpty: false,
          isLoading,
        }),
      { initialProps: { isLoading: true } },
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();

    rerender({ isLoading: false });

    await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledTimes(1));
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WATCHLIST_PAGE_VIEWED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      token_count: 2,
      is_empty: false,
      active_tab: WatchlistAnalytics.ACTIVE_TAB.TOKENS,
      source: WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
    });
  });

  it('tracks only once when props update after the initial fire', async () => {
    const { rerender } = renderHook(
      ({ tokenCount, isEmpty }) =>
        useTrackWatchlistPageViewed({
          tokenCount,
          isEmpty,
          isLoading: false,
        }),
      { initialProps: { tokenCount: 1, isEmpty: false } },
    );

    await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledTimes(1));

    rerender({ tokenCount: 0, isEmpty: true });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('uses custom source when provided', async () => {
    renderHook(() =>
      useTrackWatchlistPageViewed({
        tokenCount: 0,
        isEmpty: true,
        isLoading: false,
        source: 'custom_source',
      }),
    );

    await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledTimes(1));
    expect(mockAddProperties).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'custom_source' }),
    );
  });
});
