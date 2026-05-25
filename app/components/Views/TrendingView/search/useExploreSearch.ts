import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { strings } from '../../../../../locales/i18n';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { useSitesFeed } from '../feeds/sites/useSitesFeed';

/** Feeds that participate in the omni-search across the Explore page. */
export type SearchFeedId =
  | 'tokens'
  | 'perps'
  | 'stocks'
  | 'predictions'
  | 'sites';

const DEBOUNCE_MS = 200;
const TOP_ITEMS_WITHOUT_QUERY = 3;

export interface SearchFeedSection<T = unknown> {
  feedId: SearchFeedId;
  title: string;
  items: T[];
  isLoading: boolean;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  total?: number;
}

export interface ExploreSearchResult {
  sections: SearchFeedSection[];
}

export interface UseExploreSearchOptions {
  /** Limit each section to TOP_ITEMS_WITHOUT_QUERY when there is no query. */
  truncateWithoutQuery?: boolean;
  /** Page size passed to usePredictionsFeed. Defaults to 20. */
  predictionsPageSize?: number;
  /** Forward fetchMore / hasMore / total on sections that support it. */
  exposePagination?: boolean;
  /** 'v1' uses trending.* keys; 'v2' uses trending.search_tabs.* keys. */
  titleVariant?: 'v1' | 'v2';
}
export const useExploreSearch = (
  query: string,
  options: UseExploreSearchOptions = {},
): ExploreSearchResult => {
  const {
    truncateWithoutQuery = false,
    predictionsPageSize = 20,
    exposePagination = false,
    titleVariant = 'v2',
  } = options;

  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const isDebouncing = query !== debouncedQuery;

  const tokens = useTokensFeed({ query: debouncedQuery });
  const perps = usePerpsFeed({ query: debouncedQuery });
  const stocks = useStocksFeed({ query: debouncedQuery });
  const predictions = usePredictionsFeed({
    variant: 'trending',
    query: debouncedQuery,
    pageSize: predictionsPageSize,
  });
  const sites = useSitesFeed({ query: debouncedQuery });

  return useMemo<ExploreSearchResult>(() => {
    const showTopItems = truncateWithoutQuery && !debouncedQuery.trim();
    const trim = <T>(arr: T[]) =>
      showTopItems ? arr.slice(0, TOP_ITEMS_WITHOUT_QUERY) : arr;

    const t = (v2Key: string, v1Key: string) =>
      strings(titleVariant === 'v2' ? v2Key : v1Key);

    const sections: SearchFeedSection[] = [
      {
        feedId: 'tokens',
        title: t('trending.search_tabs.crypto', 'trending.crypto'),
        items: trim(tokens.data),
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
        title: t('trending.search_tabs.perps', 'trending.perps'),
        items: trim(perps.data.map((d) => d.market)),
        isLoading: isDebouncing || perps.isLoading,
      });
    }

    sections.push(
      {
        feedId: 'stocks',
        title: t('trending.search_tabs.stocks', 'trending.stocks'),
        items: trim(stocks.data),
        isLoading: isDebouncing || stocks.isLoading,
      },
      {
        feedId: 'predictions',
        title: t('trending.search_tabs.predictions', 'wallet.predict'),
        items: trim(predictions.data),
        isLoading: isDebouncing || predictions.isLoading,
        ...(exposePagination && {
          fetchMore: predictions.fetchMore,
          isFetchingMore: predictions.isFetchingMore,
          hasMore: predictions.hasMore,
          total: predictions.total,
        }),
      },
      {
        feedId: 'sites',
        title: t('trending.search_tabs.sites', 'trending.sites'),
        items: trim(sites.data),
        isLoading: isDebouncing || sites.isLoading,
      },
    );

    return { sections };
  }, [
    debouncedQuery,
    isDebouncing,
    isPerpsEnabled,
    truncateWithoutQuery,
    exposePagination,
    titleVariant,
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
    predictions.data,
    predictions.isLoading,
    predictions.fetchMore,
    predictions.isFetchingMore,
    predictions.hasMore,
    predictions.total,
    sites.data,
    sites.isLoading,
  ]);
};
