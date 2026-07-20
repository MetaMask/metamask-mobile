import {
  PREDICT_FEED_IDS,
  PREDICT_FEED_REGISTRY,
  isPredictFeedId,
  resolvePredictFeedConfig,
  resolvePredictFeedDefaultFilter,
  resolvePredictFeedDefaultTab,
  resolvePredictFeedDynamicFilterConfig,
  type PredictDynamicFilterConfig,
  type PredictFeedFilterConfig,
} from './feedConfig';

const getAllStaticFilters = (): PredictFeedFilterConfig[] =>
  Object.values(PREDICT_FEED_REGISTRY).flatMap((feed) =>
    feed.tabs.flatMap((tab) => tab.filters.static),
  );

const getAllDynamicFilters = (): PredictDynamicFilterConfig[] =>
  Object.values(PREDICT_FEED_REGISTRY)
    .flatMap((feed) => feed.tabs.map((tab) => tab.filters.dynamic))
    .filter((filter): filter is PredictDynamicFilterConfig => Boolean(filter));

describe('feedConfig', () => {
  it('centralizes the exact v1 feed ids and excludes World Cup', () => {
    expect(Object.keys(PREDICT_FEED_REGISTRY)).toEqual([...PREDICT_FEED_IDS]);
    expect(PREDICT_FEED_IDS).toEqual([
      'sports',
      'politics',
      'crypto',
      'live',
      'trending',
    ]);
    expect(isPredictFeedId('world-cup')).toBe(false);
    expect(isPredictFeedId('popular-today')).toBe(false);
  });

  it.each(PREDICT_FEED_IDS)('resolves known feed id %s', (feedId) => {
    expect(isPredictFeedId(feedId)).toBe(true);
    expect(resolvePredictFeedConfig(feedId)?.id).toBe(feedId);
  });

  it('returns undefined for unknown feed ids', () => {
    expect(isPredictFeedId('unknown')).toBe(false);
    expect(resolvePredictFeedConfig('unknown')).toBeUndefined();
    expect(resolvePredictFeedConfig()).toBeUndefined();
  });

  it('defines at least one tab for every feed', () => {
    Object.values(PREDICT_FEED_REGISTRY).forEach((feed) => {
      expect(feed.tabs.length).toBeGreaterThan(0);
    });
  });

  it.each(PREDICT_FEED_IDS)(
    'uses the first tab as the default tab for %s',
    (feedId) => {
      expect(resolvePredictFeedDefaultTab(feedId)).toBe(
        PREDICT_FEED_REGISTRY[feedId].tabs[0],
      );
    },
  );

  it('resolves every tab default filter from static filters', () => {
    Object.values(PREDICT_FEED_REGISTRY).forEach((feed) => {
      feed.tabs.forEach((tab) => {
        const defaultFilter = tab.filters.static.find(
          (filter) => filter.id === tab.defaultFilterId,
        );

        expect(defaultFilter).toBeDefined();
        expect(resolvePredictFeedDefaultFilter(feed.id, tab.id)).toBe(
          defaultFilter,
        );
      });
    });
  });

  it.each(PREDICT_FEED_IDS)(
    'falls back to the first tab when resolving the default filter for %s without a tabId',
    (feedId) => {
      const firstTab = PREDICT_FEED_REGISTRY[feedId].tabs[0];
      const expected = firstTab.filters.static.find(
        (filter) => filter.id === firstTab.defaultFilterId,
      );

      expect(resolvePredictFeedDefaultFilter(feedId)).toBe(expected);
    },
  );

  it('returns undefined when resolving the default filter for unknown feeds or tabs', () => {
    expect(resolvePredictFeedDefaultFilter('unknown')).toBeUndefined();
    expect(
      resolvePredictFeedDefaultFilter('sports', 'unknown-tab'),
    ).toBeUndefined();
  });

  it('represents hidden-tab feeds with exactly one tab', () => {
    (['politics', 'crypto', 'live', 'trending'] as const).forEach((feedId) => {
      expect(PREDICT_FEED_REGISTRY[feedId].tabs).toHaveLength(1);
    });
  });

  it('defines the v1 sports tabs from the Figma shell', () => {
    expect(PREDICT_FEED_REGISTRY.sports.tabs.map((tab) => tab.id)).toEqual([
      'basketball',
      'tennis',
      'soccer',
      'baseball',
      'football',
    ]);
  });

  it('uses related-tags dynamic filters with supported base slugs', () => {
    const dynamicFilters = getAllDynamicFilters();
    const sources = new Set(dynamicFilters.map((filter) => filter.source));
    const baseTagSlugs = new Set(
      dynamicFilters
        .map((filter) => filter.baseTagSlug)
        .filter((baseTagSlug): baseTagSlug is string => Boolean(baseTagSlug)),
    );

    expect(sources).toEqual(new Set(['related-tags']));
    expect(baseTagSlugs).toEqual(
      new Set(['sports', 'politics', 'crypto', 'all']),
    );
  });

  it('resolves the dynamic filter config for a feed from the registry', () => {
    expect(resolvePredictFeedDynamicFilterConfig('trending')).toBe(
      PREDICT_FEED_REGISTRY.trending.tabs[0].filters.dynamic,
    );
  });

  it('returns undefined dynamic config for feeds without one, unknown feeds, or unknown tabs', () => {
    expect(resolvePredictFeedDynamicFilterConfig('live')).toBeUndefined();
    expect(resolvePredictFeedDynamicFilterConfig('unknown')).toBeUndefined();
    expect(
      resolvePredictFeedDynamicFilterConfig('sports', 'unknown-tab'),
    ).toBeUndefined();
  });

  it('keeps static market params category-free', () => {
    const allowedParamKeys = new Set([
      'tags',
      'tagSlugs',
      'series',
      'order',
      'status',
      'live',
      'search',
      'limit',
      'afterCursor',
    ]);

    getAllStaticFilters().forEach((filter) => {
      const params = filter.params as Record<string, unknown>;

      expect('category' in params).toBe(false);
      expect(
        Object.keys(params).every((key) => allowedParamKeys.has(key)),
      ).toBe(true);
    });
  });
});
