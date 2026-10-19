import type {
  PredictFilterOptionSource,
  PredictMarketListParams,
} from '../types';
import type {
  PredictHomeCategoriesConfig,
  PredictHomeCategoryConfig,
  PredictSportsFeedChipConfig,
  PredictSportsFeedConfig,
  PredictSportsFeedTabConfig as PredictSportsFeedRemoteTabConfig,
} from '../types/flags';
import {
  DEFAULT_PREDICT_HOME_CATEGORIES_FLAG,
  DEFAULT_PREDICT_SPORTS_FEED_FLAG,
  PREDICT_POLYMARKET_GAMES_TAG_ID,
  resolvePredictHomeCategoryCopy,
} from './flags';

/** Feeds bundled with the client and always resolvable. */
export const PREDICT_FEED_IDS = [
  'sports',
  'politics',
  'crypto',
  'live',
  'trending',
] as const;

export type PredictBuiltInFeedId = (typeof PREDICT_FEED_IDS)[number];

/**
 * Identifier of a generic Predict feed (`PredictFeedView` route param).
 *
 * Either a {@link PredictBuiltInFeedId} or the `id` of a category defined by
 * the `predictHomeCategories` remote flag (PRED-1226), which resolves to a
 * tag-filtered category feed without a client release. Use
 * {@link resolvePredictFeedConfig} to validate a value at runtime.
 */
export type PredictFeedId = PredictBuiltInFeedId | (string & {});

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
  /**
   * Optional client-side minimum outcome volume for game-card filtering.
   * When set, markets below this volume are hidden. When absent, no volume filter.
   */
  filterByVolume?: number;
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
  titleKey?: string;
  /** Literal title (remote category feeds). Takes precedence over `titleKey`. */
  label?: string;
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

const removeStartTimeMinFromQueryParams = (
  queryParams: string,
): string | undefined => {
  const params = new URLSearchParams(queryParams);
  params.delete('start_time_min');
  return params.toString() || undefined;
};

const withSportsChipOverrides = (
  params: PredictMarketListParams,
  chip: PredictSportsFeedChipConfig,
  { applyStartTimeOverride = true }: { applyStartTimeOverride?: boolean } = {},
): PredictMarketListParams => {
  const queryParams = normalizeSportsChipQueryParams(chip.queryParams);
  const resolvedParams: PredictMarketListParams = queryParams
    ? { queryParams }
    : { ...params };

  if (chip.order) {
    resolvedParams.order = chip.order;
  }

  if (chip.startTimeMinMinutesAgo === null) {
    delete resolvedParams.startTimeMinMinutesAgo;

    if (resolvedParams.queryParams) {
      const queryParamsWithoutStartTimeMin = removeStartTimeMinFromQueryParams(
        resolvedParams.queryParams,
      );

      if (queryParamsWithoutStartTimeMin) {
        resolvedParams.queryParams = queryParamsWithoutStartTimeMin;
      } else {
        delete resolvedParams.queryParams;
      }
    }

    return resolvedParams;
  }

  if (!applyStartTimeOverride) {
    return resolvedParams;
  }

  if (
    typeof chip.startTimeMinMinutesAgo === 'number' &&
    Number.isFinite(chip.startTimeMinMinutesAgo)
  ) {
    resolvedParams.startTimeMinMinutesAgo = chip.startTimeMinMinutesAgo;
  }

  return resolvedParams;
};

const getFilterByVolume = (filterByVolume?: number): number | undefined =>
  typeof filterByVolume === 'number' && Number.isFinite(filterByVolume)
    ? filterByVolume
    : undefined;

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
  filterByVolume: getFilterByVolume(chip.filterByVolume),
});

const createPropsFilter = (
  params: PredictMarketListParams,
  gamesTagId: string,
  chip: PredictSportsFeedChipConfig,
): PredictFeedFilterConfig => {
  const propsParams: PredictMarketListParams = { ...params };
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
    filterByVolume: getFilterByVolume(chip.filterByVolume),
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
  const tagParams: PredictMarketListParams = { ...params };
  delete tagParams.startTimeMinMinutesAgo;

  return {
    id: chip.id,
    titleKey: chip.titleKey,
    label: chip.label,
    params: withSportsChipOverrides(
      tagSlug
        ? {
            ...tagParams,
            tagSlugs: [tagSlug],
            order: 'start_time',
          }
        : tagParams,
      chip,
      { applyStartTimeOverride: false },
    ),
    showLiveFirst: true,
    filterByVolume: getFilterByVolume(chip.filterByVolume),
  };
};

/**
 * Builds the generic tag-filtered category feed (the Politics / Crypto
 * pattern): back + search header, a single tab, markets filtered by the
 * Polymarket Gamma `tag_slug`, sorted by `volume24hr`, `status: open`, with
 * dynamic related-tag chips from `/tags/slug/{tagSlug}/related-tags/tags`.
 */
export const createPredictCategoryFeedConfig = ({
  id,
  titleKey,
  label,
  tagSlug,
}: {
  id: PredictFeedId;
  titleKey?: string;
  label?: string;
  tagSlug: string;
}): PredictFeedConfig => ({
  id,
  titleKey,
  label,
  header: {
    showBackButton: true,
    showSearchButton: true,
  },
  tabs: [
    {
      id: 'all',
      titleKey,
      label,
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
    .map((tab) => createSportsTab(tab, PREDICT_POLYMARKET_GAMES_TAG_ID))
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

export const PREDICT_FEED_REGISTRY: Record<
  PredictBuiltInFeedId,
  PredictFeedConfig
> = {
  sports: createPredictSportsFeedConfig(),
  politics: createPredictCategoryFeedConfig({
    id: 'politics',
    titleKey: 'predict.category.politics',
    tagSlug: 'politics',
  }),
  crypto: createPredictCategoryFeedConfig({
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

/** True for feeds bundled with the client (see {@link PREDICT_FEED_IDS}). */
export const isPredictFeedId = (
  value?: string | null,
): value is PredictBuiltInFeedId =>
  Boolean(value && PREDICT_FEED_ID_SET.has(value));

/**
 * Finds the home category (remote or bundled) whose `id` matches `feedId`.
 * Disabled categories still resolve so existing deeplinks keep working after a
 * tile is hidden from the rail.
 */
export const findPredictHomeCategory = (
  feedId: string,
  homeCategoriesConfig?: PredictHomeCategoriesConfig,
): PredictHomeCategoryConfig | undefined =>
  (
    homeCategoriesConfig?.categories ??
    DEFAULT_PREDICT_HOME_CATEGORIES_FLAG.categories
  ).find((category) => category.id === feedId);

const createFeedFromHomeCategory = (
  category: PredictHomeCategoryConfig,
): PredictFeedConfig => {
  const { titleKey, label } = resolvePredictHomeCategoryCopy(category);
  return createPredictCategoryFeedConfig({
    id: category.id,
    tagSlug: category.tagSlug,
    titleKey,
    label,
  });
};

/**
 * Resolves a feed id into a render-ready config.
 *
 * `sports` always uses the dedicated sports feed (remote `sportsFeedConfig`
 * when supplied, bundled otherwise). `live` and `trending` always use their
 * registry configs so an LD tile with those ids cannot replace Live Now /
 * Trending / Popular Today. When a remote `homeCategoriesConfig` is
 * supplied, any other id matching one of its categories resolves to a generic
 * tag-filtered category feed, so tiles added or re-slugged in LaunchDarkly open
 * a working feed. Otherwise built-in ids come from the registry, and bundled
 * category ids (`esports`, `culture`, …) resolve from the bundled rail.
 */
export const resolvePredictFeedConfig = (
  feedId?: string | null,
  sportsFeedConfig?: PredictSportsFeedConfig,
  homeCategoriesConfig?: PredictHomeCategoriesConfig,
): PredictFeedConfig | undefined => {
  if (!feedId) {
    return undefined;
  }

  if (feedId === 'sports') {
    return sportsFeedConfig
      ? createPredictSportsFeedConfig(sportsFeedConfig)
      : PREDICT_FEED_REGISTRY.sports;
  }

  if (feedId === 'live' || feedId === 'trending') {
    return PREDICT_FEED_REGISTRY[feedId];
  }

  if (homeCategoriesConfig) {
    const remoteCategory = findPredictHomeCategory(
      feedId,
      homeCategoriesConfig,
    );
    if (remoteCategory) {
      return createFeedFromHomeCategory(remoteCategory);
    }
  }

  if (isPredictFeedId(feedId)) {
    return PREDICT_FEED_REGISTRY[feedId];
  }

  const bundledCategory = findPredictHomeCategory(feedId);
  return bundledCategory
    ? createFeedFromHomeCategory(bundledCategory)
    : undefined;
};

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
