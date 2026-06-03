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
  /** Forward fetchMore / hasMore / total on sections that support it. */
  exposePagination?: boolean;
}
export const useExploreSearch = (
  query: string,
  options: UseExploreSearchOptions = {},
): ExploreSearchResult => {
  const { exposePagination = false } = options;

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
  });
  const sites = useSitesFeed({ query: debouncedQuery });

  return useMemo<ExploreSearchResult>(() => {
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
      {
        feedId: 'predictions',
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
      {
        feedId: 'sites',
        title: strings('trending.search_tabs.sites'),
        items: sites.data,
        isLoading: isDebouncing || sites.isLoading,
      },
    );

    return { sections };
  }, [
    isDebouncing,
    isPerpsEnabled,
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
  ]);
};
