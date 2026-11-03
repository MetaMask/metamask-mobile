import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { strings } from '../../../../../locales/i18n';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import {
  usePredictTrendingFeed,
  usePredictTrendingSupported,
} from '../../../UI/PredictNext';
import { useSitesFeed } from '../feeds/sites/useSitesFeed';
import { useEarnSearchFeed } from '../feeds/earn/useEarnSearchFeed';
import { selectIsExploreEarnSectionVisible } from '../../../UI/Earn/selectors/visibility';
import {
  useExploreSearchPerformance,
  type ExploreSearchFeedId,
  type ExploreSearchPerformance,
} from './useExploreSearchPerformance';
import type { SearchEntryPoint } from './analytics';

/** Feeds that participate in the omni-search across the Explore page. */
export type SearchFeedId = ExploreSearchFeedId;

const DEBOUNCE_MS = 200;

export interface SearchFeedSection<T = unknown> {
  feedId: SearchFeedId;
  title: string;
  items: T[];
  isLoading: boolean;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  /** Server-reported total; it may be larger than the loaded item count. */
  total?: number;
}

export interface ExploreSearchResult {
  sections: SearchFeedSection[];
  performanceLifecycle: Pick<ExploreSearchPerformance, 'onFocus' | 'onBlur'>;
}

export interface UseExploreSearchOptions {
  /** Forward fetchMore / hasMore / total on sections that support it. */
  exposePagination?: boolean;
  entryPoint?: SearchEntryPoint;
  /** Enables performance measurement for the focused Explore Search screen. */
  isFocused?: boolean;
  /** Rechecks cached feed readiness after a navigation focus event. */
  focusCount?: number;
}
export const useExploreSearch = (
  query: string,
  options: UseExploreSearchOptions = {},
): ExploreSearchResult => {
  const {
    exposePagination = false,
    entryPoint,
    isFocused = false,
    focusCount = 0,
  } = options;

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isExploreEarnEnabled = useSelector(selectIsExploreEarnSectionVisible);
  const isPredictionsSupported = usePredictTrendingSupported('search');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const isDebouncing = query !== debouncedQuery;

  const enabledFeeds = useMemo<ExploreSearchFeedId[]>(
    () => [
      'tokens',
      ...(isPerpsEnabled ? (['perps'] as const) : []),
      ...(isExploreEarnEnabled ? (['earn'] as const) : []),
      'stocks',
      'predictions',
      'sites',
    ],
    [isExploreEarnEnabled, isPerpsEnabled],
  );
  const searchPerformance = useExploreSearchPerformance({
    query,
    isDebouncing,
    enabledFeeds,
    configuredDebounceMs: DEBOUNCE_MS,
    entryPoint,
    isFocused,
  });

  const tokens = useTokensFeed({
    query: debouncedQuery,
    performance: debouncedQuery.trim() ? searchPerformance.tokens : undefined,
  });
  const perps = usePerpsFeed({ query: debouncedQuery });
  const stocks = useStocksFeed({
    query: debouncedQuery,
    performance: debouncedQuery.trim() ? searchPerformance.stocks : undefined,
  });
  const predictions = usePredictTrendingFeed({ query: debouncedQuery });
  const sites = useSitesFeed({ query: debouncedQuery });
  const earn = useEarnSearchFeed({
    query: debouncedQuery,
    enabled: isExploreEarnEnabled,
  });

  const result = useMemo<ExploreSearchResult>(() => {
    const sections: SearchFeedSection[] = [
      {
        feedId: 'tokens',
        title: strings('trending.search_tabs.crypto'),
        items: tokens.data,
        isLoading: isDebouncing || tokens.isLoading,
        ...(exposePagination && {
          fetchMore: tokens.loadMore,
          isFetchingMore: tokens.isLoadingMore,
          hasMore: tokens.hasMore,
          total: tokens.totalCount,
        }),
      },
    ];

    if (isPerpsEnabled) {
      sections.push({
        feedId: 'perps',
        title: strings('trending.search_tabs.perps'),
        items: perps.data.map((d) => d.market),
        isLoading: isDebouncing || perps.isLoading,
      });
    }

    if (isExploreEarnEnabled) {
      sections.push({
        feedId: 'earn',
        title: strings('trending.search_tabs.earn'),
        items: earn.data,
        isLoading: isDebouncing || earn.isLoading,
        total: earn.data.length,
      });
    }

    sections.push(
      {
        feedId: 'stocks',
        title: strings('trending.search_tabs.stocks'),
        items: stocks.data,
        isLoading: isDebouncing || stocks.isLoading,
        ...(exposePagination && {
          fetchMore: stocks.loadMore,
          isFetchingMore: stocks.isLoadingMore,
          hasMore: stocks.hasMore,
          total: stocks.totalCount,
        }),
      },
      ...(isPredictionsSupported
        ? [
            {
              feedId: 'predictions' as const,
              title: strings('trending.search_tabs.predictions'),
              items: predictions.data,
              isLoading: isDebouncing || predictions.isLoading,
              ...(exposePagination && {
                fetchMore: predictions.fetchMore,
                isFetchingMore: predictions.isFetchingMore,
                hasMore: predictions.hasMore,
                total: predictions.total,
              }),
            },
          ]
        : []),
      {
        feedId: 'sites',
        title: strings('trending.search_tabs.sites'),
        items: sites.data,
        isLoading: isDebouncing || sites.isLoading,
      },
    );

    return { sections, performanceLifecycle: searchPerformance };
  }, [
    isDebouncing,
    isPerpsEnabled,
    isExploreEarnEnabled,
    isPredictionsSupported,
    exposePagination,
    tokens.data,
    tokens.isLoading,
    tokens.loadMore,
    tokens.isLoadingMore,
    tokens.hasMore,
    tokens.totalCount,
    perps.data,
    perps.isLoading,
    stocks.data,
    stocks.isLoading,
    stocks.loadMore,
    stocks.isLoadingMore,
    stocks.hasMore,
    stocks.totalCount,
    predictions.data,
    predictions.isLoading,
    predictions.fetchMore,
    predictions.isFetchingMore,
    predictions.hasMore,
    predictions.total,
    sites.data,
    sites.isLoading,
    earn.data,
    earn.isLoading,
    searchPerformance,
  ]);

  useEffect(() => {
    result.sections.forEach((section) => {
      if (query.trim() && !section.isLoading) {
        if (section.feedId === 'tokens') {
          searchPerformance.tokens.markCachedResult?.(query);
        } else if (section.feedId === 'stocks') {
          searchPerformance.stocks.markCachedResult?.(query);
        } else if (section.feedId === 'predictions') {
          searchPerformance.predictions.markCachedResult?.(query);
        }
      }

      searchPerformance.markFeedReady(
        section.feedId,
        !section.isLoading,
        section.items.length,
      );
    });
  }, [focusCount, isFocused, query, result.sections, searchPerformance]);

  return result;
};
