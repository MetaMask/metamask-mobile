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

/** Feeds that participate in the omni-search across the Explore page. */
export type SearchFeedId =
  | 'tokens'
  | 'perps'
  | 'stocks'
  | 'predictions'
  | 'sites';

const DEBOUNCE_MS = 200;

/** Result shape per feed so consumers can render with the right row item. */
export type SearchFeedData =
  | { feedId: 'tokens'; items: TrendingAsset[] }
  | { feedId: 'stocks'; items: TrendingAsset[] }
  | { feedId: 'perps'; items: PerpsMarketData[] }
  | { feedId: 'predictions'; items: PredictMarketType[] }
  | { feedId: 'sites'; items: SiteData[] };

export interface SearchFeedSection<T = unknown> {
  feedId: SearchFeedId;
  title: string;
  items: T[];
  isLoading: boolean;
}

export interface ExploreSearchResult {
  /** Ordered sections to render. Perps is omitted when the flag is disabled. */
  sections: SearchFeedSection[];
}

/**
 * Aggregates the 5 search-relevant feeds (tokens, perps, stocks, predictions,
 * sites) and applies common search behavior: debouncing and top-N truncation
 * when no query is present.
 */
export const useExploreSearch = (query: string): ExploreSearchResult => {
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
        title: strings('trending.tabs.crypto'),
        items: tokens.data,
        isLoading: isDebouncing || tokens.isLoading,
      },
    ];

    if (isPerpsEnabled) {
      sections.push({
        feedId: 'perps',
        title: strings('trending.perps'),
        items: perps.data.map((d) => d.market),
        isLoading: isDebouncing || perps.isLoading,
      });
    }

    sections.push(
      {
        feedId: 'stocks',
        title: strings('trending.stocks'),
        items: stocks.data,
        isLoading: isDebouncing || stocks.isLoading,
      },
      {
        feedId: 'predictions',
        title: strings('trending.predictions'),
        items: predictions.data,
        isLoading: isDebouncing || predictions.isLoading,
      },
      {
        feedId: 'sites',
        title: strings('trending.sites'),
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
    perps.data,
    perps.isLoading,
    stocks.data,
    stocks.isLoading,
    predictions.data,
    predictions.isLoading,
    sites.data,
    sites.isLoading,
  ]);
};
