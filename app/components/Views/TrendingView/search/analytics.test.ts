import { renderHook, act } from '@testing-library/react-hooks';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import {
  getExploreSearchResultCount,
  getSearchQueryLength,
  getTotalSectionResultCount,
  trackExplorePredictTrendingAssetViewed,
  trackExploreSearchAbandoned,
  trackExploreSearchEvent,
  trackExploreSearchOpened,
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

describe('getSearchQueryLength', () => {
  it.each([
    ['eth', 3],
    ['  eth  ', 3],
    ['wrapped eth', 11],
    ['   ', 0],
    ['', 0],
  ])('returns the trimmed length of %p', (query, expected) => {
    expect(getSearchQueryLength(query)).toBe(expected);
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
      query_length: 3,
    });
  });

  it('sends the trimmed query length on the searched event', () => {
    renderHook(() =>
      useInstrumentedSearchEffect({
        searchQuery: '  eth  ',
        isLoading: false,
        getPill,
        getSections,
      }),
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].properties).toMatchObject({
      search_query: '  eth  ',
      query_length: 3,
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

  it('redacts a clipboard query from the searched event', () => {
    renderHook(() =>
      useInstrumentedSearchEffect({
        searchQuery: 'clipboard-secret',
        redactSearchQuery: true,
        isLoading: false,
        getPill,
        getSections,
      }),
    );

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          interaction_type: 'searched',
          search_query: '',
        }),
      }),
    );
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

  describe('trackExploreSearchOpened', () => {
    it.each([['home' as const], ['explore' as const], ['deeplink' as const]])(
      'tracks the opened interaction with entry_point %s',
      (entryPoint) => {
        trackExploreSearchOpened(entryPoint);

        expect(mockTrackEvent).toHaveBeenCalledTimes(1);

        const event = mockTrackEvent.mock.calls[0][0];

        expect(event.name).toBe(
          MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
        );
        expect(event.properties).toEqual({
          interaction_type: 'opened',
          search_query: '',
          entry_point: entryPoint,
        });
      },
    );

    it('fires once per call so re-entering search re-fires', () => {
      trackExploreSearchOpened('home');
      trackExploreSearchOpened('explore');

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('trackExploreSearchAbandoned', () => {
    const lastEventProperties = () =>
      mockTrackEvent.mock.calls[mockTrackEvent.mock.calls.length - 1][0]
        .properties;

    it('fires abandoned with the session entry point and last settled search', () => {
      trackExploreSearchOpened('home');
      trackExploreSearchEvent({
        interaction_type: 'searched',
        search_query: 'eth',
        tab_name: 'all',
        result_count: 12,
      });
      mockTrackEvent.mockClear();

      trackExploreSearchAbandoned('cancel', 'eth');

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).toBe(
        MetaMetricsEvents.EXPLORE_SEARCH_INTERACTED.category,
      );
      expect(lastEventProperties()).toEqual({
        interaction_type: 'abandoned',
        search_query: 'eth',
        query_length: 3,
        abandon_reason: 'cancel',
        entry_point: 'home',
        tab_name: 'all',
        result_count: 12,
      });
    });

    it('redacts a clipboard query but keeps its length and result count', () => {
      trackExploreSearchOpened('home');
      trackExploreSearchEvent({
        interaction_type: 'searched',
        search_query: '',
        tab_name: 'all',
        result_count: 4,
      });
      mockTrackEvent.mockClear();

      trackExploreSearchAbandoned('back', 'clipboard-secret', true);

      expect(lastEventProperties()).toEqual({
        interaction_type: 'abandoned',
        search_query: '',
        query_length: 16,
        abandon_reason: 'back',
        entry_point: 'home',
        tab_name: 'all',
        result_count: 4,
      });
    });

    it('fires with an empty query when the user leaves without searching', () => {
      trackExploreSearchOpened('explore');
      mockTrackEvent.mockClear();

      trackExploreSearchAbandoned('back', '');

      expect(lastEventProperties()).toEqual({
        interaction_type: 'abandoned',
        search_query: '',
        query_length: 0,
        abandon_reason: 'back',
        entry_point: 'explore',
      });
    });

    it('omits result_count when the query changed after the last settled search', () => {
      trackExploreSearchOpened('home');
      trackExploreSearchEvent({
        interaction_type: 'searched',
        search_query: 'eth',
        tab_name: 'all',
        result_count: 12,
      });

      trackExploreSearchAbandoned('navigate_away', 'ethe');

      expect(lastEventProperties()).not.toHaveProperty('result_count');
      expect(lastEventProperties()).toMatchObject({ query_length: 4 });
    });

    it('uses the tab from the last tab switch', () => {
      trackExploreSearchOpened('home');
      trackExploreSearchEvent({
        interaction_type: 'tab_switched',
        search_query: 'eth',
        tab_name: 'perps',
        previous_tab: 'all',
      });

      trackExploreSearchAbandoned('back', 'eth');

      expect(lastEventProperties()).toMatchObject({ tab_name: 'perps' });
    });

    it.each([
      ['a row', undefined],
      ['the footer', 'search_footer' as const],
    ])('does not fire after a result click on %s', (_label, sectionName) => {
      trackExploreSearchOpened('home');
      trackExploreSearchEvent({
        interaction_type: 'result_clicked',
        search_query: 'eth',
        tab_name: 'all',
        ...(sectionName ? { section_name: sectionName } : {}),
      });
      mockTrackEvent.mockClear();

      trackExploreSearchAbandoned('back', 'eth');

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('fires once per session', () => {
      trackExploreSearchOpened('home');
      mockTrackEvent.mockClear();

      trackExploreSearchAbandoned('cancel', 'eth');
      trackExploreSearchAbandoned('navigate_away', 'eth');

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('fires again after a new open', () => {
      trackExploreSearchOpened('home');
      trackExploreSearchAbandoned('cancel', '');
      trackExploreSearchOpened('nav_bar');
      mockTrackEvent.mockClear();

      trackExploreSearchAbandoned('navigate_away', '');

      expect(lastEventProperties()).toMatchObject({
        entry_point: 'nav_bar',
        abandon_reason: 'navigate_away',
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
