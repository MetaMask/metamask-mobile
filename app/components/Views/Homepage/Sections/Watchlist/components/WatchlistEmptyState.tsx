import React, { useCallback } from 'react';
import type { CaipAssetType } from '@metamask/utils';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import {
  Theme,
  useTheme as useDesignSystemTheme,
} from '@metamask/design-system-twrnc-preset';
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
import WatchlistEmptyDarkIcon from '../../../../../../images/watchlist-empty-dark.svg';
import WatchlistEmptyLightIcon from '../../../../../../images/watchlist-empty-light.svg';

const SUGGESTED_SKELETON_COUNT = 3;

/** Matches the perps watchlist suggested-section animation timing. */
const ANIMATION_DURATION = 250;

interface SuggestedTokensListProps {
  tokens: WatchlistTokenWithBalance[];
  onAddPress: (token: WatchlistTokenWithBalance) => void;
}

/** Perps-style list-add mode: hint subtitle + suggested rows with a + button. */
const SuggestedTokensList: React.FC<SuggestedTokensListProps> = ({
  tokens,
  onAddPress,
}) => (
  <Box testID="watchlist-empty-state">
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextDefault}
      twClassName="mb-1"
      testID="watchlist-empty-subtitle"
    >
      {strings('token_watchlist.home_empty_add_hint')}
    </Text>
    <Animated.View layout={LinearTransition.duration(ANIMATION_DURATION)}>
      {tokens.map((token) => (
        <Animated.View
          key={String(token.assetId)}
          entering={FadeIn.duration(ANIMATION_DURATION)}
          exiting={FadeOut.duration(ANIMATION_DURATION)}
          layout={LinearTransition.duration(ANIMATION_DURATION)}
        >
          <TrendingTokenRowItem
            token={mapWatchlistTokenToTrendingAsset(token)}
            tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
            endAction={{ type: 'watchlist', onPress: () => onAddPress(token) }}
          />
        </Animated.View>
      ))}
    </Animated.View>
  </Box>
);

/** Static fallback when no suggested tokens are available. */
const EmptyWatchlistFallback: React.FC = () => {
  const designSystemTheme = useDesignSystemTheme();
  const EmptyIcon =
    designSystemTheme === Theme.Dark
      ? WatchlistEmptyDarkIcon
      : WatchlistEmptyLightIcon;

  return (
    <Box
      testID="watchlist-empty-fallback"
      alignItems={BoxAlignItems.Center}
      gap={2}
      padding={4}
    >
      <EmptyIcon
        name="watchlist-empty"
        width={72}
        height={78}
        testID="watchlist-empty-icon"
      />
      <Text
        variant={TextVariant.HeadingSm}
        color={TextColor.TextDefault}
        twClassName="text-center"
      >
        {strings('token_watchlist.home_empty_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('token_watchlist.home_empty_subtitle')}
      </Text>
    </Box>
  );
};

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

  if (suggestedTokens && suggestedTokens.length > 0) {
    return (
      <SuggestedTokensList
        tokens={suggestedTokens}
        onAddPress={handleAddPress}
      />
    );
  }

  return <EmptyWatchlistFallback />;
};

export default WatchlistEmptyState;
