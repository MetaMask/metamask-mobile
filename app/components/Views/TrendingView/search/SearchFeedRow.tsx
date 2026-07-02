import React, { useCallback, useRef } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type { PredictMarket as PredictMarketType } from '../../../UI/Predict/types';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { TokenSearchRowItem } from '../feeds/tokens/TokenRowItem';
import TrendingTokensSkeleton from '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import PerpsRowItem from '../feeds/perps/PerpsRowItem';
import { PredictionSearchRowItem } from '../feeds/predictions/PredictionRowItem';
import { SiteRowItem } from '../feeds/sites/SiteRowItem';
import SiteSkeleton from '../../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import type { SearchFeedId } from './useExploreSearch';
import TapView from './TapView';
import { trackExploreSearchEvent, type SearchFeedPill } from './analytics';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';

interface SearchFeedRowProps {
  feedId: SearchFeedId;
  item: unknown;
  index: number;
  searchQuery: string;
  tabName: SearchFeedPill;
  resultCount?: number;
  onQuickTrade?: (token: TrendingAsset) => void;
}

export const getItemId = (feedId: SearchFeedId, item: unknown): string => {
  switch (feedId) {
    case 'tokens':
    case 'stocks':
      return (item as TrendingAsset).assetId ?? '';
    case 'perps':
      return (item as PerpsMarketData).symbol ?? '';
    case 'predictions':
      return (item as PredictMarketType).id ?? '';
    case 'sites':
      return (item as SiteData).url ?? '';
  }
};

/** Renders a search-result row for any feed and tracks taps with analytics. */
const SearchFeedRow: React.FC<SearchFeedRowProps> = ({
  feedId,
  item,
  index,
  searchQuery,
  tabName,
  resultCount,
  onQuickTrade,
}) => {
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const resultCountRef = useRef(resultCount);
  resultCountRef.current = resultCount;

  const handleTap = useCallback(() => {
    trackExploreSearchEvent({
      interaction_type: 'result_clicked',
      search_query: searchQueryRef.current,
      ...(tabName === 'all' ? { section_name: feedId } : {}),
      tab_name: tabName,
      item_clicked: getItemId(feedId, item),
      position: index,
      result_count: resultCountRef.current,
    });
  }, [feedId, tabName, item, index]);

  const row = (() => {
    switch (feedId) {
      case 'tokens':
      case 'stocks':
        return (
          <TokenSearchRowItem
            token={item as TrendingAsset}
            index={index}
            tokenDetailsSource={TokenDetailsSource.ExploreSearch}
            onQuickTrade={onQuickTrade}
          />
        );
      case 'perps':
        return <PerpsRowItem market={item as PerpsMarketData} />;
      case 'predictions':
        return <PredictionSearchRowItem market={item as PredictMarketType} />;
      case 'sites':
        return <SiteRowItem site={item as SiteData} />;
    }
  })();

  return <TapView onTap={handleTap}>{row}</TapView>;
};

/** Skeleton row appropriate for a given feed. */
export const SearchFeedSkeleton: React.FC<{ feedId: SearchFeedId }> = ({
  feedId,
}) => {
  switch (feedId) {
    case 'sites':
    case 'predictions':
      return <SiteSkeleton />;
    case 'tokens':
    case 'stocks':
    case 'perps':
    default:
      return <TrendingTokensSkeleton />;
  }
};

export default SearchFeedRow;
