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
import {
  selectTokenWatchlistEnabled,
  selectUnifiedWatchlistEnabled,
} from '../../../../UI/Assets/selectors/featureFlags';
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
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { useUnifiedWatchlist } from '../../../../UI/Watchlist/hooks/useUnifiedWatchlist';
import WatchlistUnavailablePerpRow from '../../../../UI/Watchlist/WatchlistUnavailablePerpRow';
import WatchlistErrorRow from '../../../../UI/Watchlist/WatchlistErrorRow';
import PerpsMarketRowItem from '../../../../UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import { usePerpsNavigation } from '../../../../UI/Perps/hooks/usePerpsNavigation';
import { usePerpsWatchlistActions } from '../../../../UI/Perps/hooks/usePerpsWatchlistActions';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  getPerpsWatchlistKey,
  getTokenWatchlistKey,
  selectWatchlistSuggestions,
} from '../../../../UI/Watchlist/utils';
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

interface WatchlistSectionShellProps extends WatchlistSectionProps {
  enabled: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  itemCount: number;
  showInitialSkeletons: boolean;
  showFallback: boolean;
  showSuggestedSkeletons: boolean;
  refresh: () => Promise<void>;
  children: React.ReactNode;
}

const useTrackAndAddWatchlistToken = (
  onAfterAdd?: (assetId: string) => void,
): ((token: WatchlistTokenWithBalance) => void) => {
  const addMutation = useTokenWatchlistAddItemMutation();
  const analytics = useAnalytics();

  return useCallback(
    (token: WatchlistTokenWithBalance) => {
      const assetId = String(token.assetId);
      addMutation.mutate(token, {
        onSuccess: () => {
          analytics.trackEvent(
            analytics
              .createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_ADDED)
              .addProperties({
                source: WatchlistAnalytics.ADD_SOURCE.HOMEPAGE,
                asset_id: assetId,
                asset_type: getWatchlistAssetType(assetId),
                has_balance: token.isInWallet,
              })
              .build(),
          );
          onAfterAdd?.(assetId);
        },
      });
    },
    [addMutation, analytics, onAfterAdd],
  );
};

const WatchlistSectionShell = forwardRef<
  SectionRefreshHandle,
  WatchlistSectionShellProps
>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      enabled,
      isLoading,
      isEmpty,
      itemCount,
      showInitialSkeletons,
      showFallback,
      showSuggestedSkeletons,
      refresh,
      children,
    },
    ref,
  ) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation<AppNavigationProp>();

    const handleSectionPress = useCallback(() => {
      navigation.navigate(Routes.WALLET.WATCHLIST_FULL_VIEW);
    }, [navigation]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: enabled ? sectionViewRef : null,
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
      demandStarted: enabled,
      cacheState: isLoading ? 'cold' : 'warm',
      isLoading,
      enabled,
    });

    if (!enabled) {
      return null;
    }

    const renderContent = (): React.ReactNode => {
      if (showInitialSkeletons) {
        return Array.from({ length: MAX_ITEMS_DISPLAYED }, (_, index) => (
          <TrendingTokensSkeleton key={`watchlist-skeleton-${index}`} />
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

      return children;
    };

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <SectionDivider />
        <SectionHeader
          title={strings('homepage.sections.watchlist')}
          isInteractive
          onPress={handleSectionPress}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('watchlist')}
        />
        <SectionRow>{renderContent()}</SectionRow>
      </View>
    );
  },
);

const LegacyWatchlistSection = forwardRef<
  SectionRefreshHandle,
  WatchlistSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const isWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const { data, isLoading, refetch } = useTokenWatchlistQuery();
  const { data: suggestedPool, isLoading: isSuggestedLoading } =
    useSuggestedWatchlistItemsQuery();
  const watchlistAssetIds = useTokenWatchlistAssetIds();
  const handleAddPress = useTrackAndAddWatchlistToken();

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
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <WatchlistSectionShell
      ref={ref}
      sectionIndex={sectionIndex}
      totalSectionsLoaded={totalSectionsLoaded}
      enabled={isWatchlistEnabled}
      isLoading={isLoading}
      isEmpty={isEmpty}
      itemCount={displayTokens.length}
      showInitialSkeletons={isLoading}
      showFallback={
        isEmpty && !isSuggestedLoading && suggestedTokens.length === 0
      }
      showSuggestedSkeletons={isEmpty && isSuggestedLoading}
      refresh={refresh}
    >
      <>
        {displayTokens.map((token, index) => (
          <WatchlistAnimatedRow key={token.assetId}>
            <TrendingTokenRowItem
              token={token}
              position={index}
              tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
              twClassName="-mx-4 w-auto px-4"
            />
          </WatchlistAnimatedRow>
        ))}
        {suggestedTokens.length > 0 ? (
          <WatchlistSuggestedSection
            tokens={suggestedTokens}
            hasWatchlist={displayTokens.length > 0}
            onAddPress={handleAddPress}
          />
        ) : null}
      </>
    </WatchlistSectionShell>
  );
});

const MixedWatchlistSection = forwardRef<
  SectionRefreshHandle,
  WatchlistSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const {
    items,
    tokens,
    perps,
    suggestedPerps,
    canUseLivePerpsPrices,
    canUseMotion,
    canRefresh,
    canFetchSuggestions,
    tokenMembershipAssetIds,
    perpsMembershipSymbols,
    tokenCount,
    perpsCount,
    isOrderReady,
    appendOrderKey,
    isInitialLoading,
    refresh,
  } = useUnifiedWatchlist();
  const { data: suggestedPool, isLoading: isSuggestedLoading } =
    useSuggestedWatchlistItemsQuery({ enabled: canFetchSuggestions });
  const { navigateToMarketDetails } = usePerpsNavigation();
  const { addToWatchlist: addPerpToWatchlist, removeFromWatchlist } =
    usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.WALLET_HOME, {
      showToasts: false,
    });

  const handleAfterTokenAdd = useCallback(
    (assetId: string) => {
      if (isOrderReady) {
        appendOrderKey(getTokenWatchlistKey(assetId)).catch(() => undefined);
      }
    },
    [appendOrderKey, isOrderReady],
  );
  const handleAddPress = useTrackAndAddWatchlistToken(handleAfterTokenAdd);

  const handleAddPerpPress = useCallback(
    async (market: PerpsMarketData) => {
      const didAdd = await addPerpToWatchlist(market.symbol);
      if (!didAdd || !isOrderReady) {
        return;
      }
      await appendOrderKey(getPerpsWatchlistKey(market.symbol)).catch(
        () => undefined,
      );
    },
    [addPerpToWatchlist, appendOrderKey, isOrderReady],
  );

  const handlePerpPress = useCallback(
    (market: PerpsMarketData) => {
      navigateToMarketDetails(market, PERPS_EVENT_VALUE.SOURCE.WALLET_HOME);
    },
    [navigateToMarketDetails],
  );

  const displayItems = items.slice(0, MAX_ITEMS_DISPLAYED);
  const remainingSuggestedCount = Math.max(
    0,
    SUGGESTED_WATCHLIST_LIMIT - (tokenCount + perpsCount),
  );
  const suggestedRows = useMemo(
    () =>
      selectWatchlistSuggestions(suggestedPool ?? [], suggestedPerps, {
        limit: remainingSuggestedCount,
        watchlistedTokenAssetIds: tokenMembershipAssetIds,
        watchlistedTokenSymbols: tokens.items.map((item) =>
          String(item.token.symbol),
        ),
        watchlistedPerpSymbols: perpsMembershipSymbols,
      }),
    [
      perpsMembershipSymbols,
      remainingSuggestedCount,
      suggestedPerps,
      suggestedPool,
      tokenMembershipAssetIds,
      tokens.items,
    ],
  );

  const hasError = Boolean(tokens.error ?? perps.error);
  const isEmpty = !isInitialLoading && displayItems.length === 0 && !hasError;
  const retryHandler = canRefresh
    ? (): void => {
        refresh().catch(() => undefined);
      }
    : undefined;

  return (
    <WatchlistSectionShell
      ref={ref}
      sectionIndex={sectionIndex}
      totalSectionsLoaded={totalSectionsLoaded}
      enabled
      isLoading={isInitialLoading}
      isEmpty={isEmpty}
      itemCount={displayItems.length}
      showInitialSkeletons={isInitialLoading && displayItems.length === 0}
      showFallback={
        isEmpty && !isSuggestedLoading && suggestedRows.length === 0
      }
      showSuggestedSkeletons={
        isEmpty && isSuggestedLoading && suggestedRows.length === 0
      }
      refresh={refresh}
    >
      <>
        {hasError ? <WatchlistErrorRow onRetry={retryHandler} /> : null}
        {displayItems.map((item, index) => {
          if (item.kind === 'token') {
            return (
              <WatchlistAnimatedRow key={item.key} enableMotion={canUseMotion}>
                <TrendingTokenRowItem
                  token={item.token}
                  position={index}
                  tokenDetailsSource={TokenDetailsSource.WatchlistHomepage}
                  twClassName="-mx-4 w-auto px-4"
                />
              </WatchlistAnimatedRow>
            );
          }

          if (item.status === 'unavailable') {
            return (
              <WatchlistAnimatedRow key={item.key} enableMotion={canUseMotion}>
                <WatchlistUnavailablePerpRow
                  item={item}
                  onRemove={() => {
                    removeFromWatchlist(item.symbol).catch(() => undefined);
                  }}
                  twClassName="-mx-4 w-auto px-4"
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
                enableLivePrices={canUseLivePerpsPrices}
                twClassName="-mx-4 w-auto px-4"
                onPress={handlePerpPress}
              />
            </WatchlistAnimatedRow>
          );
        })}
        {suggestedRows.length > 0 &&
        !(hasError && displayItems.length === 0) ? (
          <WatchlistSuggestedSection
            rows={suggestedRows}
            hasWatchlist={displayItems.length > 0}
            onAddPress={handleAddPress}
            onPerpPress={handlePerpPress}
            onAddPerpPress={(market) => {
              handleAddPerpPress(market).catch(() => undefined);
            }}
            canUseLivePerpsPrices={canUseLivePerpsPrices}
            enableMotion={canUseMotion}
          />
        ) : null}
      </>
    </WatchlistSectionShell>
  );
});

const WatchlistSection = forwardRef<
  SectionRefreshHandle,
  WatchlistSectionProps
>((props, ref) => {
  const isTokenWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const isUnifiedWatchlistEnabled = useSelector(selectUnifiedWatchlistEnabled);
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

  if (isTokenWatchlistEnabled && isUnifiedWatchlistEnabled && isPerpsEnabled) {
    return <MixedWatchlistSection {...props} ref={ref} />;
  }

  return <LegacyWatchlistSection {...props} ref={ref} />;
});

export default WatchlistSection;
