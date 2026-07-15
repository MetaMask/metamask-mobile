import type {
  PredictFilterOptionSource,
  PredictMarketListParams,
} from '../types';

export const PREDICT_FEED_IDS = [
  'sports',
  'politics',
  'crypto',
  'live',
  'trending',
  'popular-today',
] as const;

export type PredictFeedId = (typeof PREDICT_FEED_IDS)[number];

export interface PredictDynamicFilterConfig {
  source: PredictFilterOptionSource;
  /** Polymarket related-tags root slug. Use 'all' for general popular/trending lists. */
  baseTagSlug?: string;
  baseParams?: PredictMarketListParams;
  limit?: number;
}

export interface PredictFeedFilterConfig {
  id: string;
  titleKey?: string;
  label?: string;
  params: PredictMarketListParams;
}

export interface PredictFeedFiltersConfig {
  static: PredictFeedFilterConfig[];
  dynamic?: PredictDynamicFilterConfig;
}

export interface PredictFeedTabConfig {
  id: string;
  titleKey: string;
  defaultFilterId: string;
  filters: PredictFeedFiltersConfig;
}

export interface PredictFeedConfig {
  id: PredictFeedId;
  titleKey: string;
  header: {
    showBackButton: boolean;
    showSearchButton: boolean;
  };
  tabs: PredictFeedTabConfig[];
}

const FILTER_TITLE_KEYS = {
  all: 'predict.feed.filters.all',
  live: 'predict.feed.filters.live',
} as const;

const createAllFilter = (
  params: PredictMarketListParams,
): PredictFeedFilterConfig => ({
  id: 'all',
  titleKey: FILTER_TITLE_KEYS.all,
  params,
});

const createLiveFilter = (
  params: PredictMarketListParams,
): PredictFeedFilterConfig => ({
  id: 'live',
  titleKey: FILTER_TITLE_KEYS.live,
  params: {
    ...params,
    live: true,
  },
});

const createCategoryFeed = ({
  id,
  titleKey,
  tagSlug,
}: {
  id: Extract<PredictFeedId, 'politics' | 'crypto'>;
  titleKey: string;
  tagSlug: string;
}): PredictFeedConfig => ({
  id,
  titleKey,
  header: {
    showBackButton: true,
    showSearchButton: true,
  },
  tabs: [
    {
      id: 'all',
      titleKey,
      defaultFilterId: 'all',
      filters: {
        static: [
          createAllFilter({
            tagSlugs: [tagSlug],
            status: 'open',
            order: 'volume24hr',
          }),
        ],
        dynamic: {
          source: 'related-tags',
          baseTagSlug: tagSlug,
          baseParams: {
            tagSlugs: [tagSlug],
            status: 'open',
            order: 'volume24hr',
          },
        },
      },
    },
  ],
});

const createSportsTab = ({
  id,
  titleKey,
}: {
  id: string;
  titleKey: string;
}): PredictFeedTabConfig => {
  const baseParams: PredictMarketListParams = {
    tagSlugs: ['sports', id],
    status: 'open',
    order: 'volume24hr',
  };

  return {
    id,
    titleKey,
    defaultFilterId: 'all',
    filters: {
      static: [createAllFilter(baseParams), createLiveFilter(baseParams)],
      dynamic: {
        source: 'related-tags',
        baseTagSlug: 'sports',
        baseParams,
      },
    },
  };
};

export const PREDICT_FEED_REGISTRY: Record<PredictFeedId, PredictFeedConfig> = {
  sports: {
    id: 'sports',
    titleKey: 'predict.category.sports',
    header: {
      showBackButton: true,
      showSearchButton: true,
    },
    tabs: [
      createSportsTab({
        id: 'basketball',
        titleKey: 'predict.feed.tabs.basketball',
      }),
      createSportsTab({
        id: 'tennis',
        titleKey: 'predict.feed.tabs.tennis',
      }),
      createSportsTab({
        id: 'soccer',
        titleKey: 'predict.feed.tabs.soccer',
      }),
      createSportsTab({
        id: 'baseball',
        titleKey: 'predict.feed.tabs.baseball',
      }),
      createSportsTab({
        id: 'football',
        titleKey: 'predict.feed.tabs.football',
      }),
    ],
  },
  politics: createCategoryFeed({
    id: 'politics',
    titleKey: 'predict.category.politics',
    tagSlug: 'politics',
  }),
  crypto: createCategoryFeed({
    id: 'crypto',
    titleKey: 'predict.category.crypto',
    tagSlug: 'crypto',
  }),
  live: {
    id: 'live',
    titleKey: 'predict.feed.live',
    header: {
      showBackButton: true,
      showSearchButton: true,
    },
    tabs: [
      {
        id: 'live',
        titleKey: 'predict.feed.live',
        defaultFilterId: 'live',
        filters: {
          static: [
            createLiveFilter({
              status: 'open',
              order: 'volume24hr',
              limit: 10,
            }),
          ],
        },
      },
    ],
  },
  trending: {
    id: 'trending',
    titleKey: 'predict.category.trending',
    header: {
      showBackButton: true,
      showSearchButton: true,
    },
    tabs: [
      {
        id: 'all',
        titleKey: 'predict.category.trending',
        defaultFilterId: 'all',
        filters: {
          static: [
            createAllFilter({
              status: 'open',
              order: 'volume24hr',
              // Fetch 10 (not the ~5 shown) so the home Trending section still
              // fills its display cap after standalone/staleness filtering, and
              // so the "See all" feed loads 10 per infinite-scroll page.
              limit: 10,
            }),
          ],
          dynamic: {
            source: 'related-tags',
            baseTagSlug: 'all',
            baseParams: {
              status: 'open',
              order: 'volume24hr',
              limit: 10,
            },
          },
        },
      },
    ],
  },
  'popular-today': {
    id: 'popular-today',
    titleKey: 'predict.feed.popular_today',
    header: {
      showBackButton: true,
      showSearchButton: true,
    },
    tabs: [
      {
        id: 'all',
        titleKey: 'predict.feed.popular_today',
        defaultFilterId: 'all',
        filters: {
          static: [
            createAllFilter({
              status: 'open',
              order: 'volume24hr',
              limit: 12,
            }),
          ],
          dynamic: {
            source: 'related-tags',
            baseTagSlug: 'all',
            baseParams: {
              status: 'open',
              order: 'volume24hr',
              limit: 12,
            },
          },
        },
      },
    ],
  },
};

const PREDICT_FEED_ID_SET = new Set<string>(PREDICT_FEED_IDS);

export const isPredictFeedId = (
  value?: string | null,
): value is PredictFeedId => Boolean(value && PREDICT_FEED_ID_SET.has(value));

export const resolvePredictFeedConfig = (
  feedId?: string | null,
): PredictFeedConfig | undefined =>
  isPredictFeedId(feedId) ? PREDICT_FEED_REGISTRY[feedId] : undefined;

export const resolvePredictFeedDefaultTab = (
  feedId?: string | null,
): PredictFeedTabConfig | undefined =>
  resolvePredictFeedConfig(feedId)?.tabs[0];

export const resolvePredictFeedDefaultFilter = (
  feedId?: string | null,
  tabId?: string | null,
): PredictFeedFilterConfig | undefined => {
  const config = resolvePredictFeedConfig(feedId);
  const tab = tabId
    ? config?.tabs.find((candidateTab) => candidateTab.id === tabId)
    : config?.tabs[0];

  return tab?.filters.static.find(
    (filter) => filter.id === tab.defaultFilterId,
  );
};

export const resolvePredictFeedDynamicFilterConfig = (
  feedId?: string | null,
  tabId?: string | null,
): PredictDynamicFilterConfig | undefined => {
  const config = resolvePredictFeedConfig(feedId);
  const tab = tabId
    ? config?.tabs.find((candidateTab) => candidateTab.id === tabId)
    : config?.tabs[0];

  return tab?.filters.dynamic;
};
