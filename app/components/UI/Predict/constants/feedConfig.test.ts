import { DEFAULT_PREDICT_HOME_CATEGORIES_FLAG } from './flags';
import type { PredictHomeCategoriesConfig } from '../types/flags';
import {
  PREDICT_FEED_IDS,
  PREDICT_FEED_REGISTRY,
  createPredictCategoryFeedConfig,
  createPredictSportsFeedConfig,
  findPredictHomeCategory,
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

  it('labels golf and combat games chips as Tournaments and Fights', () => {
    const golfTab = PREDICT_FEED_REGISTRY.sports.tabs.find(
      (tab) => tab.id === 'golf',
    );
    const combatTab = PREDICT_FEED_REGISTRY.sports.tabs.find(
      (tab) => tab.id === 'combat',
    );

    expect(
      golfTab?.filters.static.find((filter) => filter.id === 'games')?.titleKey,
    ).toBe('predict.feed.filters.tournaments');
    expect(
      combatTab?.filters.static.find((filter) => filter.id === 'games')
        ?.titleKey,
    ).toBe('predict.feed.filters.fights');
  });

  it('includes ITF in the default tennis filters', () => {
    const tennisTab = PREDICT_FEED_REGISTRY.sports.tabs.find(
      (tab) => tab.id === 'tennis',
    );

    expect(tennisTab?.filters.static.map((filter) => filter.id)).toEqual([
      'games',
      'props',
      'atp',
      'wta',
      'itf',
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
    expect(allTab.filters.static[0].filterByVolume).toBe(1000);
    expect(allTab.filters.static[0].params).toEqual({
      tagSlugs: ['sports'],
      tags: ['100639'],
      status: 'open',
      order: 'start_time',
      startTimeMinMinutesAgo: 180,
    });
    expect(allTab.filters.static[1].showLiveFirst).toBe(false);
    expect(allTab.filters.static[1].filterByVolume).toBeUndefined();
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
    expect(soccerTab.filters.static[0].filterByVolume).toBeUndefined();
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
    expect(
      soccerTab.filters.static.find((filter) => filter.id === 'mls')?.params
        .startTimeMinMinutesAgo,
    ).toBeUndefined();
  });

  it('preserves remote sports tab labels', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
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
    });
  });

  it('applies chip start time minute overrides on generated params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
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

  it('disables generated start time params when chip start time is null', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'games',
              kind: 'games',
              startTimeMinMinutesAgo: null,
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
    });
  });

  it('applies chip order overrides on generated params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'games',
              kind: 'games',
              order: 'volume',
            },
            {
              id: 'props',
              kind: 'props',
              order: 'newest',
            },
            {
              id: 'mls',
              kind: 'tag',
              tagSlug: 'mls',
              order: 'ending_soon',
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params.order).toBe('volume');
    expect(config.tabs[0].filters.static[1].params.order).toBe('newest');
    expect(config.tabs[0].filters.static[2].params.order).toBe('ending_soon');
  });

  it('applies chip start time minute overrides on custom query params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'games',
              kind: 'games',
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

  it('maps chip filterByVolume onto the resolved sports filter', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'football',
          tagSlug: 'american-football',
          chips: [
            {
              id: 'games',
              kind: 'games',
              filterByVolume: 500,
            },
            {
              id: 'props',
              kind: 'props',
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].filterByVolume).toBe(500);
    expect(config.tabs[0].filters.static[1].filterByVolume).toBeUndefined();
  });

  it('preserves chip order overrides on custom query params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'games',
              kind: 'games',
              queryParams: 'tag_slug=remote-slug&order=startTime',
              order: 'liquidity',
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      queryParams: 'tag_slug=remote-slug&order=startTime',
      order: 'liquidity',
    });
  });

  it('removes start time params from custom query params when chip start time is null', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'games',
              kind: 'games',
              queryParams:
                'tag_slug=remote-slug&order=startTime&start_time_min=2026-01-01T00%3A00%3A00.000Z',
              startTimeMinMinutesAgo: null,
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      queryParams: 'tag_slug=remote-slug&order=startTime',
    });
  });

  it('does not apply chip start time minute overrides on league query params', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'mls',
              kind: 'tag',
              queryParams: 'tag_slug=mls&order=startTime',
              startTimeMinMinutesAgo: 15,
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      queryParams: 'tag_slug=mls&order=startTime',
    });
  });

  it('removes start time params from league query params when chip start time is null', () => {
    const config = createPredictSportsFeedConfig({
      enabled: true,
      minimumVersion: '1.0.0',
      tabs: [
        {
          id: 'custom-tab',
          tagSlug: 'custom-tab',
          chips: [
            {
              id: 'mls',
              kind: 'tag',
              queryParams:
                'tag_slug=mls&order=startTime&start_time_min=2026-01-01T00%3A00%3A00.000Z',
              startTimeMinMinutesAgo: null,
            },
          ],
        },
      ],
    });

    expect(config.tabs[0].filters.static[0].params).toEqual({
      queryParams: 'tag_slug=mls&order=startTime',
    });
  });

  it('applies the sports start time lower bound to games filters', () => {
    PREDICT_FEED_REGISTRY.sports.tabs.forEach((tab) => {
      const gamesFilter = tab.filters.static.find(
        (filter) => filter.id === 'games',
      );

      expect(gamesFilter?.params.startTimeMinMinutesAgo).toBe(180);
    });
  });

  it('does not apply the sports start time lower bound to props or league filters', () => {
    PREDICT_FEED_REGISTRY.sports.tabs.forEach((tab) => {
      tab.filters.static
        .filter((filter) => filter.id !== 'games')
        .forEach((filter) => {
          expect(filter.params.startTimeMinMinutesAgo).toBeUndefined();
        });
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

describe('feedConfig home category feeds (PRED-1226)', () => {
  const remoteCategories: PredictHomeCategoriesConfig = {
    enabled: true,
    minimumVersion: '',
    categories: [
      { id: 'politics', tagSlug: 'politics', label: 'Politics' },
      { id: 'sports', tagSlug: 'sports', label: 'Sports' },
      { id: 'weather', tagSlug: 'weather', label: 'Weather', enabled: true },
      { id: 'hidden', tagSlug: 'hidden-tag', label: 'Hidden', enabled: false },
    ],
  };

  it.each(['esports', 'culture', 'finance', 'tech'])(
    'resolves bundled category %s without an explicit config',
    (feedId) => {
      const config = resolvePredictFeedConfig(feedId);

      expect(isPredictFeedId(feedId)).toBe(false);
      expect(config?.id).toBe(feedId);
      expect(config?.titleKey).toBe(`predict.category.${feedId}`);
      expect(config?.header).toEqual({
        showBackButton: true,
        showSearchButton: true,
      });
      expect(config?.tabs).toHaveLength(1);
    },
  );

  it('maps Culture onto the Gamma pop-culture tag slug', () => {
    const config = resolvePredictFeedConfig('culture');
    const [tab] = config?.tabs ?? [];

    expect(findPredictHomeCategory('culture')?.tagSlug).toBe('pop-culture');
    expect(tab.filters.static[0].params).toEqual({
      tagSlugs: ['pop-culture'],
      status: 'open',
      order: 'volume24hr',
    });
    expect(tab.filters.dynamic).toEqual({
      source: 'related-tags',
      baseTagSlug: 'pop-culture',
      baseParams: {
        tagSlugs: ['pop-culture'],
        status: 'open',
        order: 'volume24hr',
      },
    });
  });

  it('builds category feeds that match the Politics / Crypto pattern', () => {
    const politics = PREDICT_FEED_REGISTRY.politics;
    const finance = resolvePredictFeedConfig('finance');

    expect(finance?.showFilterBar).toBe(politics.showFilterBar);
    expect(finance?.header).toEqual(politics.header);
    expect(finance?.tabs[0].defaultFilterId).toBe(
      politics.tabs[0].defaultFilterId,
    );
    expect(finance?.tabs[0].filters.static[0].params.order).toBe(
      politics.tabs[0].filters.static[0].params.order,
    );
    expect(finance?.tabs[0].filters.static[0].params.status).toBe('open');
  });

  it('resolves a remotely defined category into a working feed with its label', () => {
    const config = resolvePredictFeedConfig(
      'weather',
      undefined,
      remoteCategories,
    );

    expect(config).toEqual(
      createPredictCategoryFeedConfig({
        id: 'weather',
        tagSlug: 'weather',
        label: 'Weather',
      }),
    );
    expect(config?.label).toBe('Weather');
    expect(config?.titleKey).toBeUndefined();
    expect(config?.tabs[0].label).toBe('Weather');
    expect(config?.tabs[0].filters.static[0].params.tagSlugs).toEqual([
      'weather',
    ]);
  });

  it('still resolves a category that is disabled on the home rail', () => {
    expect(
      resolvePredictFeedConfig('hidden', undefined, remoteCategories)?.tabs[0]
        .filters.static[0].params.tagSlugs,
    ).toEqual(['hidden-tag']);
  });

  it('falls back to the bundled category when the remote config omits it', () => {
    const config = resolvePredictFeedConfig(
      'esports',
      undefined,
      remoteCategories,
    );

    expect(config?.id).toBe('esports');
    expect(config?.tabs[0].filters.static[0].params.tagSlugs).toEqual([
      'esports',
    ]);
  });

  it('localizes shipped category feeds from predict.category.* when LD omits copy', () => {
    const remote = {
      enabled: true,
      minimumVersion: '',
      categories: [
        { id: 'politics', tagSlug: 'politics' },
        { id: 'crypto', tagSlug: 'crypto' },
        { id: 'esports', tagSlug: 'esports' },
        { id: 'culture', tagSlug: 'pop-culture' },
        { id: 'weather', tagSlug: 'weather' },
      ],
    };

    for (const id of ['politics', 'crypto', 'esports', 'culture'] as const) {
      const config = resolvePredictFeedConfig(id, undefined, remote);
      expect(config?.label).toBeUndefined();
      expect(config?.titleKey).toBe(`predict.category.${id}`);
      expect(config?.tabs[0].titleKey).toBe(`predict.category.${id}`);
    }

    const weather = resolvePredictFeedConfig('weather', undefined, remote);
    expect(weather?.label).toBe('weather');
    expect(weather?.titleKey).toBeUndefined();
  });

  it('lets a remote category override a bundled built-in feed', () => {
    const config = resolvePredictFeedConfig('politics', undefined, {
      enabled: true,
      minimumVersion: '',
      categories: [
        { id: 'politics', tagSlug: 'us-politics', label: 'US Politics' },
      ],
    });

    expect(config).not.toBe(PREDICT_FEED_REGISTRY.politics);
    expect(config?.label).toBe('US Politics');
    expect(config?.tabs[0].filters.static[0].params.tagSlugs).toEqual([
      'us-politics',
    ]);
  });

  it('uses the registry config for built-in feeds without a remote config', () => {
    expect(resolvePredictFeedConfig('politics')).toBe(
      PREDICT_FEED_REGISTRY.politics,
    );
  });

  it('keeps sports on the dedicated sports feed even when listed as a category', () => {
    expect(
      resolvePredictFeedConfig('sports', undefined, remoteCategories),
    ).toBe(PREDICT_FEED_REGISTRY.sports);
    expect(
      resolvePredictFeedConfig('sports', undefined, remoteCategories)?.tabs
        .length,
    ).toBeGreaterThan(1);
  });

  it('keeps live and trending on their registry configs even when LD adds those ids', () => {
    const colliding = {
      enabled: true,
      minimumVersion: '',
      categories: [
        { id: 'live', tagSlug: 'live', label: 'Live' },
        { id: 'trending', tagSlug: 'trending', label: 'Trending' },
      ],
    };

    expect(resolvePredictFeedConfig('live', undefined, colliding)).toBe(
      PREDICT_FEED_REGISTRY.live,
    );
    expect(resolvePredictFeedConfig('trending', undefined, colliding)).toBe(
      PREDICT_FEED_REGISTRY.trending,
    );
    expect(resolvePredictFeedConfig('live', undefined, colliding)?.label).toBe(
      undefined,
    );
    expect(
      resolvePredictFeedConfig('trending', undefined, colliding)?.titleKey,
    ).toBe('predict.category.trending');
  });

  it('exposes every bundled category as a resolvable feed', () => {
    DEFAULT_PREDICT_HOME_CATEGORIES_FLAG.categories.forEach((category) => {
      expect(resolvePredictFeedConfig(category.id)?.id).toBe(category.id);
    });
  });
});
