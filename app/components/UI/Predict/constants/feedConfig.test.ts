import {
  PREDICT_FEED_IDS,
  PREDICT_FEED_REGISTRY,
  createPredictSportsFeedConfig,
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
      'all',
      'soccer',
      'baseball',
      'football',
      'basketball',
      'esports',
      'tennis',
      'cricket',
      'golf',
      'combat',
      'hockey',
    ]);
  });

  it('uses static sports filters from the configured sports feed', () => {
    const [allTab, soccerTab] = PREDICT_FEED_REGISTRY.sports.tabs;

    expect(allTab.id).toBe('all');
    expect(allTab.defaultFilterId).toBe('games');
    expect(allTab.filters.dynamic).toBeUndefined();
    expect(allTab.filters.static.map((filter) => filter.id)).toEqual([
      'games',
      'props',
    ]);
    expect(allTab.filters.static[0].showLiveFirst).toBe(true);
    expect(allTab.filters.static[0].params).toEqual({
      tagSlugs: ['sports'],
      tags: ['100639'],
      status: 'open',
      order: 'start_time',
      startTimeMinMinutesAgo: 180,
    });
    expect(allTab.filters.static[1].showLiveFirst).toBe(false);
    expect(allTab.filters.static[1].params).toEqual({
      tagSlugs: ['sports'],
      excludedTags: ['100639'],
      status: 'open',
      order: 'upcoming',
    });
    expect(soccerTab.filters.static.map((filter) => filter.id)).toEqual([
      'games',
      'props',
      'mls',
      'champions-league',
      'EPL',
      'uel',
      'la-liga',
      'serie-a',
      'bundesliga',
      'ligue-1',
      'lib',
    ]);
    expect(soccerTab.filters.static[0].params).toEqual({
      tagSlugs: ['soccer'],
      tags: ['100639'],
      status: 'open',
      order: 'start_time',
      startTimeMinMinutesAgo: 180,
    });
    expect(
      soccerTab.filters.static.find((filter) => filter.id === 'mls')?.params
        .tagSlugs,
    ).toEqual(['mls']);
    expect(
      soccerTab.filters.static.find((filter) => filter.id === 'mls')
        ?.showLiveFirst,
    ).toBe(true);
    expect(
      soccerTab.filters.static.find((filter) => filter.id === 'mls')?.params
        .order,
    ).toBe('start_time');
  });

  it('preserves remote sports tab labels', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      gamesTagId: '100639',
      tabs: [
        {
          id: 'custom-tab',
          label: 'Custom Tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'games',
              kind: 'games',
            },
          ],
        },
      ],
    });

    expect(config.tabs[0]).toEqual(
      expect.objectContaining({
        id: 'custom-tab',
        label: 'Custom Tab',
      }),
    );
  });

  it('uses custom chip query params instead of generated sports params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      gamesTagId: '100639',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'custom-chip',
              kind: 'tag',
              tagSlug: 'ignored-slug',
              queryParams:
                'limit=10&closed=true&tag_slug=remote-slug&tag_id=remote-tag-id&order=volume&ascending=false',
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      queryParams:
        'limit=10&closed=true&tag_slug=remote-slug&tag_id=remote-tag-id&order=volume&ascending=false',
    });
  });

  it('falls back to generated sports params when custom chip query params are blank', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      gamesTagId: '100639',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'custom-chip',
              kind: 'tag',
              tagSlug: 'remote-slug',
              queryParams: ' ? ',
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      tagSlugs: ['remote-slug'],
      status: 'open',
      order: 'start_time',
      startTimeMinMinutesAgo: 180,
    });
  });

  it('applies chip start time minute overrides on generated params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      gamesTagId: '100639',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'games',
              kind: 'games',
              startTimeMinMinutesAgo: 30,
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      tagSlugs: ['custom-tab'],
      tags: ['100639'],
      status: 'open',
      order: 'start_time',
      startTimeMinMinutesAgo: 30,
    });
  });

  it('applies chip start time minute overrides on custom query params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      gamesTagId: '100639',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'custom-chip',
              kind: 'tag',
              queryParams: 'tag_slug=remote-slug&order=startTime',
              startTimeMinMinutesAgo: 15,
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      queryParams: 'tag_slug=remote-slug&order=startTime',
      startTimeMinMinutesAgo: 15,
    });
  });

  it('applies the sports start time lower bound to non-props filters', () => {
    PREDICT_FEED_REGISTRY.sports.tabs.forEach((tab) => {
      tab.filters.static
        .filter((filter) => filter.id !== 'props')
        .forEach((filter) => {
          expect(filter.params.startTimeMinMinutesAgo).toBe(180);
        });
    });
  });

  it('does not apply the sports start time lower bound to props filters', () => {
    PREDICT_FEED_REGISTRY.sports.tabs.forEach((tab) => {
      const propsFilter = tab.filters.static.find(
        (filter) => filter.id === 'props',
      );

      expect(propsFilter?.params.startTimeMin).toBeUndefined();
      expect(propsFilter?.params.startTimeMinMinutesAgo).toBeUndefined();
    });
  });

  it('sorts games and league chip filters by soonest start time first', () => {
    PREDICT_FEED_REGISTRY.sports.tabs.forEach((tab) => {
      tab.filters.static
        .filter((filter) => filter.id !== 'props')
        .forEach((filter) => {
          expect(filter.params.order).toBe('start_time');
        });
    });
  });

  it('sorts props filters by soonest start date first', () => {
    PREDICT_FEED_REGISTRY.sports.tabs.forEach((tab) => {
      const propsFilter = tab.filters.static.find(
        (filter) => filter.id === 'props',
      );

      expect(propsFilter?.params.order).toBe('upcoming');
    });
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
    expect(baseTagSlugs).toEqual(new Set(['politics', 'crypto', 'all']));
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
      'excludedTags',
      'series',
      'order',
      'status',
      'live',
      'queryParams',
      'startTimeMin',
      'startTimeMinMinutesAgo',
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
