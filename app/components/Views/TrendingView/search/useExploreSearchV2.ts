import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { strings } from '../../../../../locales/i18n';
import { useTokensFeed } from '../feeds/tokens/useTokensFeed';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import { useSitesFeed } from '../feeds/sites/useSitesFeed';
import type {
  SearchFeedId,
  SearchFeedSection,
  ExploreSearchResult,
} from './useExploreSearch';

const DEBOUNCE_MS = 200;

/**
 * V2 variant of useExploreSearch: no top-N truncation (all results always
 * returned) and uses search_tabs.* string keys for tab labels.
 */
export const useExploreSearchV2 = (query: string): ExploreSearchResult => {
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
        fetchMore: tokens.loadMore,
        isFetchingMore: tokens.isLoadingMore,
        hasMore: tokens.hasMore,
        totalCount: tokens.totalCount,
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
      },
      {
        feedId: 'predictions',
        title: strings('trending.search_tabs.predictions'),
        items: predictions.data,
        isLoading: isDebouncing || predictions.isLoading,
        fetchMore: predictions.fetchMore,
        isFetchingMore: predictions.isFetchingMore,
        hasMore: predictions.hasMore,
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
    sites.data,
    sites.isLoading,
  ]);
};

export type { SearchFeedId, SearchFeedSection, ExploreSearchResult };
