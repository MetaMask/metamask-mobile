import React, { useCallback } from 'react';
import type { CaipAssetType } from '@metamask/utils';
import {
  Box,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import TrendingTokenRowItem from '../../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { useSuggestedWatchlistItemsQuery } from '../../../../../UI/Assets/watchlist/hooks/useSuggestedWatchlistItemsQuery';
import { useTokenWatchlistAddItemMutation } from '../../../../../UI/Assets/watchlist/hooks/useTokenWatchlistMutations';
import {
  getWatchlistAssetType,
  WatchlistAnalytics,
} from '../../../../../UI/Assets/watchlist/constants/watchlistAnalytics';
import type { WatchlistTokenWithBalance } from '../../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { TokenDetailsSource } from '../../../../../UI/TokenDetails/constants/constants';
import { mapWatchlistTokenToTrendingAsset } from '../utils/mapWatchlistTokenToTrendingAsset';

const SUGGESTED_SKELETON_COUNT = 3;

const WatchlistEmptyState: React.FC = () => {
  const { data: suggestedTokens, isLoading } =
    useSuggestedWatchlistItemsQuery();
  const addMutation = useTokenWatchlistAddItemMutation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const handleAddPress = useCallback(
    (token: WatchlistTokenWithBalance) => {
      const assetId = String(token.assetId) as CaipAssetType;

      addMutation.mutate(assetId, {
        onSuccess: () => {
          toast({
            title: strings('token_watchlist.added_to_watchlist'),
            severity: ToastSeverity.Success,
            hasNoTimeout: false,
            showCloseButton: false,
          });
          trackEvent(
            createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_ADDED)
              .addProperties({
                source: WatchlistAnalytics.ADD_SOURCE.HOMEPAGE_EMPTY,
                asset_id: assetId,
                asset_type: getWatchlistAssetType(String(assetId)),
                has_balance: token.isInWallet,
              })
              .build(),
          );
        },
      });
    },
    [addMutation, createEventBuilder, trackEvent],
  );

  if (isLoading) {
    return (
      <Box testID="watchlist-empty-skeleton">
        {Array.from({ length: SUGGESTED_SKELETON_COUNT }, (_, index) => (
          <TrendingTokensSkeleton key={`watchlist-empty-skeleton-${index}`} />
        ))}
      </Box>
    );
  }

  // No suggestions available — nothing to render below the section header,
  // matching the perps watchlist structure (no helper copy in the empty state).
  if (!suggestedTokens || suggestedTokens.length === 0) {
    return null;
  }

  return (
    <Box testID="watchlist-empty-state" gap={1}>
      {suggestedTokens.map((token) => (
        <TrendingTokenRowItem
          key={String(token.assetId)}
          token={mapWatchlistTokenToTrendingAsset(token)}
          tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
          onAddPress={() => handleAddPress(token)}
        />
      ))}
    </Box>
  );
};

export default WatchlistEmptyState;
