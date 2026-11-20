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
import WatchlistSuggestedSection from '../../../../UI/Watchlist/WatchlistSuggestedSection';
import WatchlistEmptyFallback from './components/WatchlistEmptyFallback';
import WatchlistAnimatedRow from './components/WatchlistAnimatedRow';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import { useSuggestedWatchlistItemsQuery } from '../../../../UI/Assets/watchlist/hooks/useSuggestedWatchlistItemsQuery';
import { useTokenWatchlistAddItemMutation } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistMutations';
import { useTokenWatchlistAssetIds } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlist';
import {
  getWatchlistAssetType,
  WatchlistAnalytics,
} from '../../../../UI/Assets/watchlist/constants/watchlistAnalytics';
import type { WatchlistTokenWithBalance } from '../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
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
import { useUnifiedWatchlist } from '../../../../UI/Watchlist/hooks/useUnifiedWatchlist';
import WatchlistTokenRowItem from '../../../../UI/Watchlist/WatchlistTokenRowItem';
import WatchlistUnavailablePerpRow from '../../../../UI/Watchlist/WatchlistUnavailablePerpRow';
import PerpsMarketRowItem from '../../../../UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import { usePerpsNavigation } from '../../../../UI/Perps/hooks/usePerpsNavigation';
import { usePerpsWatchlistActions } from '../../../../UI/Perps/hooks/usePerpsWatchlistActions';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import WatchlistErrorRow from '../../../../UI/Watchlist/WatchlistErrorRow';
import {
  INITIAL_TOKEN_SUGGESTION_COUNT,
  buildHomepageWatchlistItems,
  getSuggestedWatchlistTokens,
  prioritizeSuggestedWatchlistPerps,
  selectWatchlistSuggestions,
} from '../../../../UI/Watchlist/utils';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';

const MAX_ITEMS_DISPLAYED = 5;
const SUGGESTED_SKELETON_COUNT = 5;
const SUGGESTED_WATCHLIST_LIMIT = 5;
export { getSuggestedWatchlistTokens };

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
  const {
    isUnifiedEnabled,
    isPerpsEnabled,
    orderedItems,
    isOrderLoading = false,
    orderError = null,
    tokens: tokenState,
    perps: perpState,
    suggestedPerps,
    canUseLivePerpsPrices,
    canUseMotion = true,
    canRefresh,
    canFetchSuggestions = true,
    tokenCount: authoritativeTokenCount = tokenState.items.length,
    perpsCount: authoritativePerpsCount = perpState.items.length,
    refresh: refreshWatchlist,
  } = useUnifiedWatchlist();
  const showLegacySuggestions = !isUnifiedEnabled || !isPerpsEnabled;
  const { data: suggestedPool, isLoading: isSuggestedLoading } =
    useSuggestedWatchlistItemsQuery({
      enabled: isWatchlistEnabled && canFetchSuggestions,
    });
  const addMutation = useTokenWatchlistAddItemMutation();
  const watchlistAssetIds = useTokenWatchlistAssetIds();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { navigateToMarketDetails } = usePerpsNavigation();
  const {
    addToWatchlist: addPerpToWatchlist,
    removeFromWatchlist: removePerpFromWatchlist,
  } = usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST);
  const title = strings('homepage.sections.watchlist');

  const displayItems = useMemo(
    () =>
      showLegacySuggestions
        ? []
        : buildHomepageWatchlistItems(orderedItems, MAX_ITEMS_DISPLAYED),
    [orderedItems, showLegacySuggestions],
  );
  const displayTokens = useMemo(
    () =>
      tokenState.items.slice(0, MAX_ITEMS_DISPLAYED).map((item) => item.token),
    [tokenState.items],
  );

  const isLoading = showLegacySuggestions
    ? tokenState.isLoading
    : tokenState.isLoading || perpState.isLoading || isOrderLoading;
  const hasError = showLegacySuggestions
    ? Boolean(tokenState.error)
    : Boolean(orderError || tokenState.error || perpState.error);
  const itemCount = showLegacySuggestions
    ? displayTokens.length
    : displayItems.length;
  const isEmpty = !isLoading && itemCount === 0 && !hasError;
  const watchedItemCount =
    isUnifiedEnabled && isPerpsEnabled
      ? authoritativeTokenCount + authoritativePerpsCount
      : watchlistAssetIds.length;
  const hasWatchlist = watchedItemCount > 0;
  const remainingSuggestedCount = Math.max(
    0,
    SUGGESTED_WATCHLIST_LIMIT - watchedItemCount,
  );
  const suggestedTokens = useMemo(
    () =>
      getSuggestedWatchlistTokens(
        suggestedPool ?? [],
        watchlistAssetIds,
        watchlistAssetIds.length + remainingSuggestedCount,
      ),
    [remainingSuggestedCount, suggestedPool, watchlistAssetIds],
  );
  const prioritizedSuggestedPerps = useMemo(
    () =>
      prioritizeSuggestedWatchlistPerps(
        suggestedPerps ?? [],
        suggestedTokens
          .slice(0, INITIAL_TOKEN_SUGGESTION_COUNT)
          .map((token) => token.symbol),
      ),
    [suggestedPerps, suggestedTokens],
  );
  const visibleSuggestions = useMemo(
    () =>
      selectWatchlistSuggestions(
        suggestedTokens,
        prioritizedSuggestedPerps,
        remainingSuggestedCount,
      ),
    [prioritizedSuggestedPerps, remainingSuggestedCount, suggestedTokens],
  );
  const hasSuggestedItems =
    remainingSuggestedCount > 0 && visibleSuggestions.length > 0;

  const handleSectionPress = useCallback(() => {
    navigation.navigate(Routes.WALLET.WATCHLIST_FULL_VIEW);
  }, [navigation]);

  const refresh = useCallback(async () => {
    await refreshWatchlist();
  }, [refreshWatchlist]);

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

  const renderSectionContent = () => {
    if (showLegacySuggestions) {
      if (isLoading) {
        return (
          <Box>
            {Array.from({ length: MAX_ITEMS_DISPLAYED }, (_, i) => (
              <TrendingTokensSkeleton key={`watchlist-skeleton-${i}`} />
            ))}
          </Box>
        );
      }

      if (
        hasError &&
        displayTokens.length === 0 &&
        visibleSuggestions.length === 0
      ) {
        return (
          <WatchlistErrorRow
            onRetry={canRefresh ? refreshWatchlist : undefined}
          />
        );
      }

      const showSuggestedSkeletons = isEmpty && isSuggestedLoading;
      const showSuggestedSection = visibleSuggestions.some(
        (row) => row.kind === 'token',
      );
      const showFallback =
        isEmpty && !isSuggestedLoading && !showSuggestedSection;

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
          {hasError ? (
            <WatchlistErrorRow
              onRetry={canRefresh ? refreshWatchlist : undefined}
            />
          ) : null}
          {displayTokens.map((token, index) => (
            <WatchlistAnimatedRow
              key={token.assetId}
              enableMotion={canUseMotion}
            >
              <TrendingTokenRowItem
                token={token}
                position={index}
                tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
              />
            </WatchlistAnimatedRow>
          ))}
          {showSuggestedSection && (
            <WatchlistSuggestedSection
              rows={visibleSuggestions}
              hasWatchlist={hasWatchlist}
              onAddPress={handleAddPress}
              rowTwClassName={showLegacySuggestions ? 'px-0' : 'px-4'}
              onPerpPress={(market) =>
                navigateToMarketDetails(
                  market,
                  PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
                )
              }
              onAddPerpPress={(market) => {
                addPerpToWatchlist(market.symbol);
              }}
              showPerpBadge={false}
              canUseLivePerpsPrices={canUseLivePerpsPrices}
              enableMotion={canUseMotion}
            />
          )}
        </>
      );
    }

    if (isLoading && displayItems.length === 0) {
      return (
        <Box>
          {Array.from({ length: MAX_ITEMS_DISPLAYED }, (_, i) => (
            <TrendingTokensSkeleton key={`watchlist-skeleton-${i}`} />
          ))}
        </Box>
      );
    }

    if (isEmpty && isSuggestedLoading && !hasSuggestedItems) {
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

    if (isEmpty && !hasSuggestedItems) {
      return <WatchlistEmptyFallback />;
    }

    if (hasError && displayItems.length === 0 && !hasSuggestedItems) {
      return (
        <WatchlistErrorRow
          onRetry={canRefresh ? refreshWatchlist : undefined}
        />
      );
    }

    return (
      <>
        {hasError ? (
          <WatchlistErrorRow
            onRetry={canRefresh ? refreshWatchlist : undefined}
          />
        ) : null}
        {displayItems.map((item, index) => {
          if (item.kind === 'token') {
            return (
              <WatchlistAnimatedRow key={item.key} enableMotion={canUseMotion}>
                <WatchlistTokenRowItem
                  token={item.token}
                  position={index}
                  tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
                  twClassName="px-4"
                />
              </WatchlistAnimatedRow>
            );
          }

          if (item.status !== 'resolved') {
            return (
              <WatchlistAnimatedRow key={item.key} enableMotion={canUseMotion}>
                <WatchlistUnavailablePerpRow
                  item={item}
                  onRemove={() => {
                    removePerpFromWatchlist(item.symbol).catch(() => undefined);
                  }}
                  twClassName="px-4 py-2 min-h-0"
                />
              </WatchlistAnimatedRow>
            );
          }

          return (
            <WatchlistAnimatedRow key={item.key} enableMotion={canUseMotion}>
              <PerpsMarketRowItem
                market={item.market}
                compact
                showBadge={false}
                twClassName="px-4"
                enableLivePrices={canUseLivePerpsPrices}
                onPress={(market) =>
                  navigateToMarketDetails(
                    market,
                    PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
                  )
                }
              />
            </WatchlistAnimatedRow>
          );
        })}
        {hasSuggestedItems && (
          <WatchlistSuggestedSection
            rows={visibleSuggestions}
            hasWatchlist={hasWatchlist}
            onAddPress={handleAddPress}
            rowTwClassName={showLegacySuggestions ? 'px-0' : 'px-4'}
            onPerpPress={(market) =>
              navigateToMarketDetails(
                market,
                PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
              )
            }
            onAddPerpPress={(market) => {
              addPerpToWatchlist(market.symbol);
            }}
            showPerpBadge={false}
            canUseLivePerpsPrices={canUseLivePerpsPrices}
            enableMotion={canUseMotion}
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
      <SectionRow paddingHorizontal={showLegacySuggestions ? 4 : 0}>
        {renderSectionContent()}
      </SectionRow>
    </View>
  );
});

export default WatchlistSection;
