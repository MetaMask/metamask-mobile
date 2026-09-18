import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import SectionRow from '../../components/SectionRow';
import TrendingTokenRowItem from '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import TrendingTokensSkeleton from '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import WatchlistSuggestedSection from './components/WatchlistSuggestedSection';
import WatchlistEmptyFallback from './components/WatchlistEmptyFallback';
import WatchlistAnimatedRow from './components/WatchlistAnimatedRow';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import { useTokenWatchlistQuery } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistQuery';
import { useSuggestedWatchlistItemsQuery } from '../../../../UI/Assets/watchlist/hooks/useSuggestedWatchlistItemsQuery';
import { useTokenWatchlistAddItemMutation } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistMutations';
import { useTokenWatchlistAssetIds } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlist';
import {
  getWatchlistAssetType,
  WatchlistAnalytics,
} from '../../../../UI/Assets/watchlist/constants/watchlistAnalytics';
import type { WatchlistTokenWithBalance } from '../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { mapWatchlistTokenToTrendingAsset } from './utils/mapWatchlistTokenToTrendingAsset';
import { TokenDetailsSource } from '../../../../UI/TokenDetails/constants/constants';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import Routes from '../../../../../constants/navigation/Routes';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import type { SectionRefreshHandle } from '../../types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const MAX_ITEMS_DISPLAYED = 5;

const SUGGESTED_SKELETON_COUNT = 5;

const SUGGESTED_WATCHLIST_LIMIT = 5;

/**
 * Returns suggested watchlist tokens shown beneath the user's watchlist.
 * Target count shrinks with the watchlist size so watchlist + suggestion rows
 * always sum to `limit`; unlike the perps flow this hard-caps at zero once
 * the watchlist is full. Asset IDs are compared case-insensitively.
 */
export const getSuggestedWatchlistTokens = (
  suggestedTokens: WatchlistTokenWithBalance[],
  watchlistAssetIds: readonly string[],
  limit = SUGGESTED_WATCHLIST_LIMIT,
): WatchlistTokenWithBalance[] => {
  const targetCount = Math.max(0, limit - watchlistAssetIds.length);
  const watched = new Set(
    watchlistAssetIds.map((assetId) => assetId.toLowerCase()),
  );
  const nonWatchlisted = suggestedTokens.filter(
    (token) => !watched.has(String(token.assetId).toLowerCase()),
  );
  return nonWatchlisted.slice(0, targetCount);
};

interface WatchlistSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const WatchlistSection = forwardRef<
  SectionRefreshHandle,
  WatchlistSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const navigation = useNavigation<AppNavigationProp>();

  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const { data, isLoading, refetch } = useTokenWatchlistQuery();
  const { data: suggestedPool, isLoading: isSuggestedLoading } =
    useSuggestedWatchlistItemsQuery();
  const addMutation = useTokenWatchlistAddItemMutation();
  const watchlistAssetIds = useTokenWatchlistAssetIds();

  const { trackEvent, createEventBuilder } = useAnalytics();

  const title = strings('homepage.sections.watchlist');

  const displayTokens = useMemo(
    () =>
      (data ?? [])
        .slice()
        .reverse()
        .slice(0, MAX_ITEMS_DISPLAYED)
        .map(mapWatchlistTokenToTrendingAsset),
    [data],
  );

  const suggestedTokens = useMemo(
    () => getSuggestedWatchlistTokens(suggestedPool ?? [], watchlistAssetIds),
    [suggestedPool, watchlistAssetIds],
  );

  const isEmpty = !isLoading && displayTokens.length === 0;
  const itemCount = displayTokens.length;

  const handleSectionPress = useCallback(() => {
    navigation.navigate(Routes.WALLET.WATCHLIST_FULL_VIEW);
  }, [navigation]);

  const handleAddPress = useCallback(
    (token: WatchlistTokenWithBalance) => {
      const assetId = String(token.assetId);
      addMutation.mutate(token, {
        onSuccess: () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_ADDED)
              .addProperties({
                source: WatchlistAnalytics.ADD_SOURCE.HOMEPAGE,
                asset_id: assetId,
                asset_type: getWatchlistAssetType(assetId),
                has_balance: token.isInWallet,
              })
              .build(),
          );
        },
      });
    },
    [addMutation, createEventBuilder, trackEvent],
  );

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const { onLayout } = useHomeViewedEvent({
    sectionRef: isWatchlistEnabled ? sectionViewRef : null,
    isLoading,
    sectionName: HomeSectionNames.WATCHLIST,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty,
    itemCount,
  });

  useSectionPerformance({
    sectionId: HomeSectionNames.WATCHLIST,
    contentReady: !isLoading,
    isEmpty,
    isLoading,
    enabled: isWatchlistEnabled,
  });

  const showSuggestedSkeletons = isEmpty && isSuggestedLoading;
  const showSuggestedSection = suggestedTokens.length > 0;
  const showFallback =
    isEmpty && !isSuggestedLoading && suggestedTokens.length === 0;

  const renderSectionContent = () => {
    if (isLoading) {
      return Array.from({ length: MAX_ITEMS_DISPLAYED }, (_, i) => (
        <TrendingTokensSkeleton key={`watchlist-skeleton-${i}`} />
      ));
    }

    if (showFallback) {
      return <WatchlistEmptyFallback />;
    }

    if (showSuggestedSkeletons) {
      return (
        <Box testID="watchlist-suggested-skeleton">
          {Array.from({ length: SUGGESTED_SKELETON_COUNT }, (_, index) => (
            <TrendingTokensSkeleton
              key={`watchlist-suggested-skeleton-${index}`}
            />
          ))}
        </Box>
      );
    }

    return (
      <>
        {displayTokens.map((token, index) => (
          <WatchlistAnimatedRow key={token.assetId}>
            <TrendingTokenRowItem
              token={token}
              position={index}
              tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
            />
          </WatchlistAnimatedRow>
        ))}
        {showSuggestedSection && (
          <WatchlistSuggestedSection
            tokens={suggestedTokens}
            hasWatchlist={displayTokens.length > 0}
            onAddPress={handleAddPress}
          />
        )}
      </>
    );
  };

  if (!isWatchlistEnabled) {
    return null;
  }

  return (
    <View ref={sectionViewRef} onLayout={onLayout}>
      <SectionDivider />
      <SectionHeader
        title={title}
        isInteractive
        onPress={handleSectionPress}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')}
      />
      <SectionRow>{renderSectionContent()}</SectionRow>
    </View>
  );
});

export default WatchlistSection;
