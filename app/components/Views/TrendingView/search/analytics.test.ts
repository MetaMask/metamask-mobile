import { renderHook, act } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import {
  getExploreSearchResultCount,
  getTotalSectionResultCount,
  trackExplorePredictTrendingAssetViewed,
  trackExploreSectionSeeAll,
  useInstrumentedSearchEffect,
} from './analytics';
import type { SearchFeedSection } from './useExploreSearch';

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

const mockTrackEvent = analytics.trackEvent as jest.MockedFunction<
  typeof analytics.trackEvent
>;

const makeSection = (
  feedId: SearchFeedSection['feedId'],
  overrides: Partial<SearchFeedSection> = {},
): SearchFeedSection => ({
  feedId,
  title: feedId,
  items: [],
  isLoading: false,
  ...overrides,
});

describe('getTotalSectionResultCount', () => {
  it('sums section totals when available, otherwise item counts', () => {
    const sections = [
      makeSection('tokens', { total: 100, items: [{ id: 1 }] as unknown[] }),
      makeSection('perps', { items: [{ id: 1 }, { id: 2 }] as unknown[] }),
      makeSection('predictions', { total: 0, items: [] }),
    ];

    expect(getTotalSectionResultCount(sections)).toBe(102);
  });
});

describe('getExploreSearchResultCount', () => {
  const sections = [
    makeSection('tokens', { total: 10, items: [{ id: 1 }] as unknown[] }),
    makeSection('perps', { items: [{ id: 1 }, { id: 2 }] as unknown[] }),
    makeSection('predictions', { items: [] }),
  ];

  it('returns the total across sections for the All pill', () => {
    expect(getExploreSearchResultCount('all', sections)).toBe(12);
  });

  it('returns the active section count when that feed has results', () => {
    expect(getExploreSearchResultCount('tokens', sections)).toBe(10);
    expect(getExploreSearchResultCount('perps', sections)).toBe(2);
  });

  it('returns the total across sections for an empty feed pill fallback', () => {
    expect(getExploreSearchResultCount('predictions', sections)).toBe(12);
  });

  it('returns the active section count while that feed is loading', () => {
    const loadingSections = sections.map((s) =>
      s.feedId === 'predictions' ? { ...s, isLoading: true } : s,
    );

    expect(getExploreSearchResultCount('predictions', loadingSections)).toBe(0);
  });

  it('returns the total across sections when the active feed section is missing', () => {
    expect(getExploreSearchResultCount('sites', sections)).toBe(12);
  });
});

describe('useInstrumentedSearchEffect', () => {
  const sections = [
    makeSection('tokens', { total: 5, items: [{}] as unknown[] }),
  ];
  const getPill = jest.fn(() => 'all' as const);
  const getSections = jest.fn(() => sections);

  beforeEach(() => {
    jest.clearAllMocks();
    getPill.mockReturnValue('all');
    getSections.mockReturnValue(sections);
  });

  it('fires the searched event once when loading settles', () => {
    const { rerender } = renderHook(
      ({ isLoading }: { isLoading: boolean }) =>
        useInstrumentedSearchEffect({
          searchQuery: 'eth',
          isLoading,
          getPill,
          getSections,
        }),
      { initialProps: { isLoading: true } },
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();

    act(() => {
      rerender({ isLoading: false });
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].properties).toMatchObject({
      interaction_type: 'searched',
      search_query: 'eth',
      tab_name: 'all',
      result_count: 5,
    });
  });

  it('does not fire again for the same query', () => {
    const { rerender } = renderHook(() =>
      useInstrumentedSearchEffect({
        searchQuery: 'eth',
        isLoading: false,
        getPill,
        getSections,
      }),
    );

    act(() => {
      rerender();
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('fires again when the query changes', () => {
    const { rerender } = renderHook(
      ({ query }: { query: string }) =>
        useInstrumentedSearchEffect({
          searchQuery: query,
          isLoading: false,
          getPill,
          getSections,
        }),
      { initialProps: { query: 'eth' } },
    );

    act(() => {
      rerender({ query: 'btc' });
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent.mock.calls[1][0].properties).toMatchObject({
      search_query: 'btc',
    });
  });

  it('does not fire for an empty or whitespace-only query', () => {
    renderHook(() =>
      useInstrumentedSearchEffect({
        searchQuery: '   ',
        isLoading: false,
        getPill,
        getSections,
      }),
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('resets and fires again after the query is cleared then re-entered', () => {
    const { rerender } = renderHook(
      ({ query }: { query: string }) =>
        useInstrumentedSearchEffect({
          searchQuery: query,
          isLoading: false,
          getPill,
          getSections,
        }),
      { initialProps: { query: 'eth' } },
    );

    act(() => {
      rerender({ query: '' });
    });
    act(() => {
      rerender({ query: 'eth' });
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });
});

describe('Explore search analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackExplorePredictTrendingAssetViewed', () => {
    it('tracks Asset Viewed with Predict funnel properties for predictions_trending', () => {
      trackExplorePredictTrendingAssetViewed('Now');

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      const event = mockTrackEvent.mock.calls[0][0];

      expect(event.name).toBe(MetaMetricsEvents.ASSET_VIEWED.category);
      expect(event.properties).toEqual({
        section_name: 'predictions_trending',
        asset_type: 'prediction',
        tab_name: 'Now',
        interaction_type: 'section_see_all_tapped',
        trade_type: 'Predict',
        implementation_type: 'native',
      });
    });
  });

  describe('trackExploreSectionSeeAll', () => {
    it('tracks Explore Page Interacted and Asset Viewed for predictions_trending', () => {
      trackExploreSectionSeeAll({
        tabName: 'Now',
        sectionName: 'predictions_trending',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);

      const exploreEvent = mockTrackEvent.mock.calls[0][0];
      const assetViewedEvent = mockTrackEvent.mock.calls[1][0];

      expect(exploreEvent.name).toBe(
        MetaMetricsEvents.EXPLORE_INTERACTED.category,
      );
      expect(exploreEvent.properties).toMatchObject({
        interaction_type: 'section_see_all_tapped',
        tab_name: 'Now',
        section_name: 'predictions_trending',
      });

      expect(assetViewedEvent.name).toBe(
        MetaMetricsEvents.ASSET_VIEWED.category,
      );
      expect(assetViewedEvent.properties).toMatchObject({
        section_name: 'predictions_trending',
        asset_type: 'prediction',
        trade_type: 'Predict',
        implementation_type: 'native',
      });
    });

    it('tracks only Explore Page Interacted for non-predictions sections', () => {
      trackExploreSectionSeeAll({
        tabName: 'Crypto',
        sectionName: 'tokens_trending',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).toBe(
        MetaMetricsEvents.EXPLORE_INTERACTED.category,
      );
    });
  });
});
