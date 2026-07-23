import type {
  PredictFilterOptionSource,
  PredictMarketListParams,
} from '../types';
import type {
  PredictSportsFeedChipConfig,
  PredictSportsFeedConfig,
  PredictSportsFeedTabConfig as PredictSportsFeedRemoteTabConfig,
} from '../types/flags';
import { DEFAULT_PREDICT_SPORTS_FEED_FLAG } from './flags';

export const PREDICT_FEED_IDS = [
  'sports',
  'politics',
  'crypto',
  'live',
  'trending',
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
  showLiveFirst?: boolean;
}

export interface PredictFeedFiltersConfig {
  static: PredictFeedFilterConfig[];
  dynamic?: PredictDynamicFilterConfig;
}

export interface PredictFeedTabConfig {
  id: string;
  titleKey?: string;
  label?: string;
  defaultFilterId: string;
  filters: PredictFeedFiltersConfig;
}

export interface PredictFeedConfig {
  id: PredictFeedId;
  titleKey: string;
  /** Whether the feed exposes user-selectable filter chips. Defaults to true. */
  showFilterBar?: boolean;
  header: {
    showBackButton: boolean;
    showSearchButton: boolean;
  };
  tabs: PredictFeedTabConfig[];
}

const FILTER_TITLE_KEYS = {
  all: 'predict.feed.filters.all',
  live: 'predict.feed.filters.live',
  games: 'predict.feed.filters.games',
  props: 'predict.feed.filters.props',
} as const;
const SPORTS_START_TIME_MIN_MINUTES_AGO = 180;

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

const normalizeSportsChipQueryParams = (
  queryParams?: string,
): string | undefined => {
  const normalized = queryParams?.trim().replace(/^\?/, '').trim();
  return normalized || undefined;
};

const withSportsChipOverrides = (
  params: PredictMarketListParams,
  chip: PredictSportsFeedChipConfig,
): PredictMarketListParams => {
  const queryParams = normalizeSportsChipQueryParams(chip.queryParams);
  const resolvedParams: PredictMarketListParams = queryParams
    ? { queryParams }
    : { ...params };

  if (
    chip.startTimeMinMinutesAgo !== undefined &&
    Number.isFinite(chip.startTimeMinMinutesAgo)
  ) {
    delete resolvedParams.startTimeMin;
    resolvedParams.startTimeMinMinutesAgo = chip.startTimeMinMinutesAgo;
  }

  return resolvedParams;
};

const createGamesFilter = (
  params: PredictMarketListParams,
  gamesTagId: string,
  chip: PredictSportsFeedChipConfig,
): PredictFeedFilterConfig => ({
  id: chip.id,
  titleKey: chip.titleKey ?? FILTER_TITLE_KEYS.games,
  label: chip.label,
  params: withSportsChipOverrides(
    {
      ...params,
      tags: [...(params.tags ?? []), gamesTagId],
      order: 'start_time',
    },
    chip,
  ),
  showLiveFirst: true,
});

const createPropsFilter = (
  params: PredictMarketListParams,
  gamesTagId: string,
  chip: PredictSportsFeedChipConfig,
): PredictFeedFilterConfig => {
  const propsParams: PredictMarketListParams = { ...params };
  delete propsParams.startTimeMin;
  delete propsParams.startTimeMinMinutesAgo;

  return {
    id: chip.id,
    titleKey: chip.titleKey ?? FILTER_TITLE_KEYS.props,
    label: chip.label,
    params: withSportsChipOverrides(
      {
        ...propsParams,
        excludedTags: [...(propsParams.excludedTags ?? []), gamesTagId],
      },
      chip,
    ),
    showLiveFirst: false,
  };
};

const createTagFilter = (
  params: PredictMarketListParams,
  chip: PredictSportsFeedChipConfig,
): PredictFeedFilterConfig | undefined => {
  const tagSlug = chip.tagSlug ?? chip.id;
  if (!tagSlug && !normalizeSportsChipQueryParams(chip.queryParams)) {
    return undefined;
  }

  return {
    id: chip.id,
    titleKey: chip.titleKey,
    label: chip.label,
    params: withSportsChipOverrides(
      tagSlug
        ? {
            ...params,
            tagSlugs: [tagSlug],
            order: 'start_time',
          }
        : params,
      chip,
    ),
    showLiveFirst: true,
  };
};

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

const createSportsFilter = (
  params: PredictMarketListParams,
  gamesTagId: string,
  chip: PredictSportsFeedChipConfig,
): PredictFeedFilterConfig | undefined => {
  switch (chip.kind) {
    case 'games':
      return createGamesFilter(params, gamesTagId, chip);
    case 'props':
      return createPropsFilter(params, gamesTagId, chip);
    case 'tag':
      return createTagFilter(params, chip);
    default:
      return undefined;
  }
};

const createSportsTab = (
  tab: PredictSportsFeedRemoteTabConfig,
  gamesTagId: string,
): PredictFeedTabConfig | undefined => {
  const sportTagSlug = tab.tagSlug ?? tab.id;
  if (!sportTagSlug) {
    return undefined;
  }

  const baseParams: PredictMarketListParams = {
    tagSlugs: [sportTagSlug],
    status: 'open',
    order: 'upcoming',
    startTimeMinMinutesAgo: SPORTS_START_TIME_MIN_MINUTES_AGO,
  };
  const staticFilters = tab.chips
    .map((chip) => createSportsFilter(baseParams, gamesTagId, chip))
    .filter(
      (filter): filter is PredictFeedFilterConfig => filter !== undefined,
    );

  if (staticFilters.length === 0) {
    return undefined;
  }

  const defaultFilterId = staticFilters.some(
    (filter) => filter.id === tab.defaultFilterId,
  )
    ? (tab.defaultFilterId as string)
    : staticFilters[0].id;

  return {
    id: tab.id,
    titleKey: tab.titleKey,
    label: tab.label,
    defaultFilterId,
    filters: {
      static: staticFilters,
    },
  };
};

export const createPredictSportsFeedConfig = (
  sportsFeedConfig: PredictSportsFeedConfig = DEFAULT_PREDICT_SPORTS_FEED_FLAG,
): PredictFeedConfig => {
  const tabs = sportsFeedConfig.tabs
    .map((tab) => createSportsTab(tab, sportsFeedConfig.gamesTagId))
    .filter((tab): tab is PredictFeedTabConfig => tab !== undefined);

  if (tabs.length === 0) {
    return createPredictSportsFeedConfig(DEFAULT_PREDICT_SPORTS_FEED_FLAG);
  }

  return {
    id: 'sports',
    titleKey: 'predict.category.sports',
    header: {
      showBackButton: true,
      showSearchButton: true,
    },
    tabs,
  };
};

export const PREDICT_FEED_REGISTRY: Record<PredictFeedId, PredictFeedConfig> = {
  sports: createPredictSportsFeedConfig(),
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
    showFilterBar: false,
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
};

const PREDICT_FEED_ID_SET = new Set<string>(PREDICT_FEED_IDS);

export const isPredictFeedId = (
  value?: string | null,
): value is PredictFeedId => Boolean(value && PREDICT_FEED_ID_SET.has(value));

export const resolvePredictFeedConfig = (
  feedId?: string | null,
  sportsFeedConfig?: PredictSportsFeedConfig,
): PredictFeedConfig | undefined =>
  isPredictFeedId(feedId)
    ? feedId === 'sports'
      ? sportsFeedConfig
        ? createPredictSportsFeedConfig(sportsFeedConfig)
        : PREDICT_FEED_REGISTRY[feedId]
      : PREDICT_FEED_REGISTRY[feedId]
    : undefined;

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
