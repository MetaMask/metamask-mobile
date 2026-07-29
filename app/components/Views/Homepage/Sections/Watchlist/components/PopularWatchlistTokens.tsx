import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import TrendingTokenRowItem from '../../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { TokenDetailsSource } from '../../../../../UI/TokenDetails/constants/constants';
import { useSuggestedWatchlistItemsQuery } from '../../../../../UI/Assets/watchlist/hooks/useSuggestedWatchlistItemsQuery';
import type { SectionRefreshHandle } from '../../../types';
import { mapWatchlistTokenToTrendingAsset } from '../utils/mapWatchlistTokenToTrendingAsset';

const MAX_POPULAR_TOKENS = 3;

const PopularWatchlistTokens = forwardRef<SectionRefreshHandle>(
  (_props, ref) => {
    const { data, isLoading, refetch } = useSuggestedWatchlistItemsQuery();

    const tokens = useMemo(
      () =>
        (data ?? [])
          .slice(0, MAX_POPULAR_TOKENS)
          .map(mapWatchlistTokenToTrendingAsset),
      [data],
    );

    const refresh = useCallback(async () => {
      await refetch();
    }, [refetch]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    if (isLoading) {
      return Array.from({ length: MAX_POPULAR_TOKENS }, (_, index) => (
        <TrendingTokensSkeleton key={`popular-watchlist-skeleton-${index}`} />
      ));
    }

    return tokens.map((token, index) => (
      <TrendingTokenRowItem
        key={token.assetId}
        token={token}
        position={index}
        tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
      />
    ));
  },
);

PopularWatchlistTokens.displayName = 'PopularWatchlistTokens';

export default PopularWatchlistTokens;
