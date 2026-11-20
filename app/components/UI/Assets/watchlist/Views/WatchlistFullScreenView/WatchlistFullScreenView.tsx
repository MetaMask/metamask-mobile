import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import ReorderableList, {
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CaipAssetType } from '@metamask/utils';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FilterButton,
  FilterButtonGroup,
  FilterButtonVariant,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  useTokenWatchlistAddItemMutation,
  useTokenWatchlistRemoveItemMutation,
  useTokenWatchlistUpdateListMutation,
} from '../../hooks/useTokenWatchlistMutations';
import { useSuggestedWatchlistItemsQuery } from '../../hooks/useSuggestedWatchlistItemsQuery';
import useTrackWatchlistPageViewed from '../../hooks/useTrackWatchlistPageViewed';
import { WatchlistAnalytics } from '../../constants/watchlistAnalytics';
import { selectTokenWatchlistEnabled } from '../../../selectors/featureFlags';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEmptyCTA from '../../components/WatchlistEmptyCTA';
import WatchlistSearchContent from './WatchlistSearchContent';
import { useSelector } from 'react-redux';
import CapsuleGlass from '../../../../../../component-library/components-temp/CapsuleGlass';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import WatchlistPerpsProvider from '../../../../Watchlist/WatchlistPerpsProvider';
import { useUnifiedWatchlist } from '../../../../Watchlist/hooks/useUnifiedWatchlist';
import WatchlistSuggestedSection from '../../../../Watchlist/WatchlistSuggestedSection';
import {
  INITIAL_TOKEN_SUGGESTION_COUNT,
  createUnifiedWatchlistPerp,
  filterWatchlistItems,
  getSuggestedWatchlistTokens,
  prioritizeSuggestedWatchlistPerps,
  reorderWatchlistItems,
  selectWatchlistSuggestions,
} from '../../../../Watchlist/utils';
import type { WatchlistTokenWithBalance } from '../../utils/addBalanceToTokens';
import type {
  UnifiedWatchlistItem,
  WatchlistFilter,
} from '../../../../Watchlist/types';
import { usePerpsWatchlistActions } from '../../../../Perps/hooks/usePerpsWatchlistActions';
import { usePerpsNavigation } from '../../../../Perps/hooks/usePerpsNavigation';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import WatchlistErrorRow from '../../../../Watchlist/WatchlistErrorRow';
import type { PerpsStreamManager } from '../../../../Perps/providers/PerpsStreamManager';
import WatchlistReorderableRow from './WatchlistReorderableRow';

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;
const SUGGESTED_ITEMS_LIMIT = 10;
const MAX_WATCHED_ITEMS_FOR_SUGGESTIONS = 2;
const FILTER_BAR_STYLE: ViewStyle = {
  flexGrow: 0,
  flexShrink: 0,
};
const normalizePerpSymbol = (symbol: string): string => symbol.toLowerCase();

/** Header controls sit on the glass capsule; the default press fill would cover it. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const rowExitAnimation = FadeOut.duration(ANIMATION_DURATION);
const rowEnterAnimation = FadeIn.duration(ANIMATION_DURATION);
const rowLayoutAnimation = LinearTransition.duration(ANIMATION_DURATION);

interface WatchlistFullViewRouteParams {
  source?: string;
}

const WatchlistFullScreenViewContent = () => {
  const reduceMotion = useReducedMotion();
  const tw = useTailwind();
  const isGlassHeaderEnabled = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const {
    isUnifiedEnabled,
    isPerpsEnabled,
    orderedItems,
    isOrderLoading = false,
    isOrderReady = false,
    orderError = null,
    tokens: tokenState,
    perps: perpState,
    suggestedPerps,
    canUseLivePerpsPrices,
    canUseMotion = true,
    canUseGlass = true,
    canRefresh,
    canFetchSuggestions = true,
    tokenMembershipAssetIds: membershipAssetIds,
    isTokenMetadataComplete = true,
    tokenCount: authoritativeTokenCount = tokenState.items.length,
    perpsCount: authoritativePerpsCount = perpState.items.length,
    isInitialLoading,
    persistOrder,
    refresh,
  } = useUnifiedWatchlist();
  const shouldReduceMotion = reduceMotion || !canUseMotion;
  const enterAnimation = shouldReduceMotion ? undefined : rowEnterAnimation;
  const exitAnimation = shouldReduceMotion ? undefined : rowExitAnimation;
  const layoutAnimation = shouldReduceMotion ? undefined : rowLayoutAnimation;
  const isGlassHeader = isGlassHeaderEnabled && canUseGlass;
  const isMixedWatchlist = isUnifiedEnabled && isPerpsEnabled;
  const updateListMutation = useTokenWatchlistUpdateListMutation();
  const addTokenMutation = useTokenWatchlistAddItemMutation();
  const removeTokenMutation = useTokenWatchlistRemoveItemMutation();
  const { data: suggestedTokenPool, isLoading: isSuggestedTokenLoading } =
    useSuggestedWatchlistItemsQuery({ enabled: canFetchSuggestions });
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { addToWatchlist: addPerpToWatchlist, removeFromWatchlist } =
    usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST);
  const { navigateToMarketDetails } = usePerpsNavigation();
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [optimisticPerpAdds, setOptimisticPerpAdds] = useState<
    Map<string, PerpsMarketData>
  >(() => new Map());
  const [optimisticPerpRemovals, setOptimisticPerpRemovals] = useState<
    Set<string>
  >(() => new Set());
  const [activeFilter, setActiveFilter] = useState<WatchlistFilter>(() =>
    isMixedWatchlist ? 'all' : 'tokens',
  );

  useEffect(() => {
    if (!isMixedWatchlist) {
      setActiveFilter('tokens');
    }
  }, [isMixedWatchlist]);

  const persistedPerpSymbols = useMemo(
    () =>
      new Set(perpState.items.map((item) => normalizePerpSymbol(item.symbol))),
    [perpState.items],
  );

  useEffect(() => {
    setOptimisticPerpAdds((current) => {
      const next = new Map(current);
      current.forEach((_market, symbol) => {
        if (persistedPerpSymbols.has(symbol)) {
          next.delete(symbol);
        }
      });
      return next.size === current.size ? current : next;
    });
    setOptimisticPerpRemovals((current) => {
      const next = new Set(current);
      current.forEach((symbol) => {
        if (!persistedPerpSymbols.has(symbol)) {
          next.delete(symbol);
        }
      });
      return next.size === current.size ? current : next;
    });
  }, [persistedPerpSymbols]);

  const displayOrderedItems = useMemo(() => {
    const existingPerpSymbols = new Set<string>();
    const items = orderedItems.filter((item) => {
      if (item.kind === 'token') {
        return true;
      }
      const symbol = normalizePerpSymbol(item.symbol);
      existingPerpSymbols.add(symbol);
      return !optimisticPerpRemovals.has(symbol);
    });

    optimisticPerpAdds.forEach((market, symbol) => {
      if (!existingPerpSymbols.has(symbol)) {
        items.push(createUnifiedWatchlistPerp(market));
      }
    });
    return items;
  }, [optimisticPerpAdds, optimisticPerpRemovals, orderedItems]);

  const visibleItems = useMemo(
    () =>
      isMixedWatchlist
        ? filterWatchlistItems(displayOrderedItems, activeFilter)
        : displayOrderedItems,
    [activeFilter, displayOrderedItems, isMixedWatchlist],
  );
  const hasItems = visibleItems.length > 0;
  const hasActiveError = Boolean(
    (isMixedWatchlist && orderError) ||
      (activeFilter === 'tokens'
        ? tokenState.error
        : activeFilter === 'perps'
          ? perpState.error
          : tokenState.error || perpState.error),
  );
  const isLoading =
    (activeFilter === 'tokens'
      ? tokenState.isLoading
      : activeFilter === 'perps'
        ? perpState.isLoading
        : tokenState.isLoading || perpState.isLoading) || isOrderLoading;
  const watchedTokenAssetIds =
    membershipAssetIds ?? tokenState.items.map((item) => item.assetId);
  const displayedPerpCount = displayOrderedItems.filter(
    (item) => item.kind === 'perp',
  ).length;
  const watchedItemCount = isMixedWatchlist
    ? authoritativeTokenCount + displayedPerpCount
    : authoritativeTokenCount;
  const hasWatchlist = watchedItemCount > 0;
  const remainingSuggestedCount = Math.max(
    0,
    SUGGESTED_ITEMS_LIMIT - watchedItemCount,
  );
  const suggestedTokens = useMemo(
    () =>
      getSuggestedWatchlistTokens(
        suggestedTokenPool ?? [],
        watchedTokenAssetIds,
        watchedTokenAssetIds.length + remainingSuggestedCount,
      ),
    [remainingSuggestedCount, suggestedTokenPool, watchedTokenAssetIds],
  );
  const prioritizedSuggestedPerps = useMemo(
    () =>
      prioritizeSuggestedWatchlistPerps(
        (suggestedPerps ?? []).filter(
          (market) =>
            !optimisticPerpAdds.has(normalizePerpSymbol(market.symbol)),
        ),
        suggestedTokens
          .slice(0, INITIAL_TOKEN_SUGGESTION_COUNT)
          .map((token) => token.symbol),
      ),
    [optimisticPerpAdds, suggestedPerps, suggestedTokens],
  );
  const canShowSuggestions =
    !isDragging &&
    watchedItemCount <= MAX_WATCHED_ITEMS_FOR_SUGGESTIONS &&
    remainingSuggestedCount > 0;
  const visibleSuggestions = useMemo(
    () =>
      canShowSuggestions
        ? selectWatchlistSuggestions(
            activeFilter !== 'perps' ? suggestedTokens : [],
            activeFilter !== 'tokens' ? prioritizedSuggestedPerps : [],
            remainingSuggestedCount,
          )
        : [],
    [
      activeFilter,
      canShowSuggestions,
      prioritizedSuggestedPerps,
      remainingSuggestedCount,
      suggestedTokens,
    ],
  );
  const hasSuggestions = visibleSuggestions.length > 0;
  const isEmpty = !isLoading && !hasItems && !hasActiveError;

  useTrackWatchlistPageViewed({
    tokenCount: authoritativeTokenCount,
    perpsCount: authoritativePerpsCount,
    isEmpty,
    isLoading: isInitialLoading,
    source: routeParams?.source ?? WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
    activeTab: activeFilter,
    isUnified: isMixedWatchlist,
  });

  const handleAddToken = useCallback(
    (token: WatchlistTokenWithBalance) => {
      addTokenMutation.mutate(token);
    },
    [addTokenMutation],
  );
  const handleAddPerp = useCallback(
    (market: PerpsMarketData) => {
      const symbol = normalizePerpSymbol(market.symbol);
      setOptimisticPerpRemovals((current) => {
        if (!current.has(symbol)) {
          return current;
        }
        const next = new Set(current);
        next.delete(symbol);
        return next;
      });
      setOptimisticPerpAdds((current) => {
        const next = new Map(current);
        next.set(symbol, market);
        return next;
      });

      addPerpToWatchlist(market.symbol)
        .then((wasAdded) => {
          if (wasAdded) {
            return;
          }
          setOptimisticPerpAdds((current) => {
            const next = new Map(current);
            next.delete(symbol);
            return next;
          });
        })
        .catch(() => {
          setOptimisticPerpAdds((current) => {
            const next = new Map(current);
            next.delete(symbol);
            return next;
          });
        });
    },
    [addPerpToWatchlist],
  );

  const handleDragStart = useCallback(() => {
    'worklet';
    scheduleOnRN(setIsDragging, true);
  }, []);

  const handleDragEnd = useCallback(() => {
    'worklet';
    scheduleOnRN(setIsDragging, false);
  }, []);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleDismissSearch = useCallback(() => {
    setIsSearchMode(false);
  }, []);

  const handleSearchPress = useCallback(() => {
    setIsSearchMode(true);
  }, []);

  const handleFilterChange = useCallback(
    (value: string) => {
      const filter = value as WatchlistFilter;
      setActiveFilter(filter);

      if (isMixedWatchlist) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.UNIFIED_WATCHLIST_FILTER_SELECTED,
          )
            .addProperties({
              filter,
              token_count: authoritativeTokenCount,
              perps_count: authoritativePerpsCount,
            })
            .build(),
        );
      }
    },
    [
      createEventBuilder,
      authoritativePerpsCount,
      authoritativeTokenCount,
      isMixedWatchlist,
      trackEvent,
    ],
  );

  const handleRemoveFromWatchlist = useCallback(
    (item: UnifiedWatchlistItem) => {
      if (item.kind === 'token') {
        removeTokenMutation.mutate(item.assetId as CaipAssetType);
        return;
      }

      const symbol = normalizePerpSymbol(item.symbol);
      setOptimisticPerpAdds((current) => {
        if (!current.has(symbol)) {
          return current;
        }
        const next = new Map(current);
        next.delete(symbol);
        return next;
      });
      setOptimisticPerpRemovals((current) => {
        const next = new Set(current);
        next.add(symbol);
        return next;
      });
      removeFromWatchlist(item.symbol)
        .then((wasRemoved) => {
          if (wasRemoved) {
            return;
          }
          setOptimisticPerpRemovals((current) => {
            const next = new Set(current);
            next.delete(symbol);
            return next;
          });
        })
        .catch(() => {
          setOptimisticPerpRemovals((current) => {
            const next = new Set(current);
            next.delete(symbol);
            return next;
          });
        });
    },
    [removeFromWatchlist, removeTokenMutation],
  );

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      const nextItems = reorderWatchlistItems(orderedItems, from, to);
      if (isMixedWatchlist) {
        persistOrder(nextItems.map((item) => item.key)).catch(() => undefined);
        return;
      }

      const nextOrder = nextItems
        .filter(
          (item): item is Extract<UnifiedWatchlistItem, { kind: 'token' }> =>
            item.kind === 'token',
        )
        .map((item) => item.assetId);
      updateListMutation.mutate(nextOrder.slice().reverse() as CaipAssetType[]);
    },
    [isMixedWatchlist, orderedItems, persistOrder, updateListMutation],
  );
  const isReorderEnabled =
    (!isMixedWatchlist || (activeFilter === 'all' && isOrderReady)) &&
    isTokenMetadataComplete &&
    optimisticPerpAdds.size === 0 &&
    optimisticPerpRemovals.size === 0;

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedWatchlistItem; index: number }) => (
      <Animated.View
        entering={enterAnimation}
        exiting={exitAnimation}
        layout={layoutAnimation}
      >
        <WatchlistReorderableRow
          item={item}
          position={index}
          isDragEnabled={isReorderEnabled}
          canUseLivePerpsPrices={canUseLivePerpsPrices}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          onMoveUp={
            isReorderEnabled && index > 0
              ? () => handleReorder({ from: index, to: index - 1 })
              : undefined
          }
          onMoveDown={
            isReorderEnabled && index < visibleItems.length - 1
              ? () => handleReorder({ from: index, to: index + 1 })
              : undefined
          }
        />
      </Animated.View>
    ),
    [
      canUseLivePerpsPrices,
      enterAnimation,
      exitAnimation,
      handleRemoveFromWatchlist,
      handleReorder,
      isReorderEnabled,
      layoutAnimation,
      visibleItems.length,
    ],
  );

  const keyExtractor = useCallback(
    (item: UnifiedWatchlistItem) => item.key,
    [],
  );

  const suggestedFooter = useMemo(() => {
    if (!hasSuggestions) {
      return null;
    }

    return (
      <Animated.View layout={layoutAnimation}>
        <WatchlistSuggestedSection
          rows={visibleSuggestions}
          hasWatchlist={hasWatchlist}
          onAddPress={handleAddToken}
          tokenDetailsSource={TokenDetailsSource.WatchlistFullscreen}
          rowTwClassName="px-4"
          onPerpPress={(market) =>
            navigateToMarketDetails(
              market,
              PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
            )
          }
          onAddPerpPress={handleAddPerp}
          showPerpBadge={false}
          canUseLivePerpsPrices={canUseLivePerpsPrices}
          enableMotion={canUseMotion}
        />
      </Animated.View>
    );
  }, [
    canUseLivePerpsPrices,
    canUseMotion,
    handleAddPerp,
    handleAddToken,
    hasWatchlist,
    hasSuggestions,
    layoutAnimation,
    navigateToMarketDetails,
    visibleSuggestions,
  ]);

  const endAccessory = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    const headerActions = (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <ButtonIcon
          iconProps={{ color: IconColor.IconDefault }}
          iconName={IconName.Search}
          size={ButtonIconSize.Md}
          onPress={handleSearchPress}
          testID={WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON}
          accessibilityLabel={strings('wallet.search_accessibility_label')}
          twClassName={HEADER_ICON_BUTTON_CLASS}
        />
      </Box>
    );

    if (!isGlassHeader) {
      return headerActions;
    }

    return (
      <CapsuleGlass twClassName="shrink-0 px-2">{headerActions}</CapsuleGlass>
    );
  }, [isGlassHeader, handleSearchPress, isSearchMode]);

  const filterBar = useMemo(() => {
    if (!isMixedWatchlist || isSearchMode) {
      return null;
    }

    return (
      <FilterButtonGroup
        value={activeFilter}
        onChange={handleFilterChange}
        variant={FilterButtonVariant.Primary}
        style={FILTER_BAR_STYLE}
        twClassName="gap-2 px-4 py-2"
        testID={WatchlistFullScreenViewSelectorsIDs.FILTERS}
      >
        <FilterButton
          value="all"
          testID={WatchlistFullScreenViewSelectorsIDs.FILTER_ALL}
        >
          {strings('trending.search_tabs.all')}
        </FilterButton>
        <FilterButton
          value="tokens"
          testID={WatchlistFullScreenViewSelectorsIDs.FILTER_TOKENS}
        >
          {strings('token_watchlist.tokens_tab')}
        </FilterButton>
        <FilterButton
          value="perps"
          testID={WatchlistFullScreenViewSelectorsIDs.FILTER_PERPS}
        >
          {strings('perps.title')}
        </FilterButton>
      </FilterButtonGroup>
    );
  }, [activeFilter, handleFilterChange, isSearchMode, isMixedWatchlist]);

  const listContent = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    if (isLoading && !hasItems) {
      return (
        <View style={tw.style('flex-1')}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <TrendingTokensSkeleton
              key={`watchlist-fullscreen-skeleton-${i}`}
            />
          ))}
        </View>
      );
    }

    if (!hasItems && hasActiveError && !hasSuggestions) {
      return <WatchlistErrorRow onRetry={canRefresh ? refresh : undefined} />;
    }

    if (!hasItems && activeFilter === 'perps' && !hasSuggestions) {
      return (
        <Box
          twClassName="flex-1 items-center justify-center px-4"
          testID={WatchlistFullScreenViewSelectorsIDs.MIXED_LIST}
        >
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('perps.no_favorites_found')}
          </Text>
          <Text twClassName="mt-2 text-center">
            {strings('perps.no_favorites_description')}
          </Text>
        </Box>
      );
    }

    if (!hasItems && !hasSuggestions) {
      if (isSuggestedTokenLoading && activeFilter !== 'perps') {
        return (
          <View style={tw.style('flex-1')}>
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <TrendingTokensSkeleton
                key={`watchlist-suggested-skeleton-${i}`}
              />
            ))}
          </View>
        );
      }

      return (
        <View style={tw.style('flex-1')}>
          <WatchlistEmptyCTA source="watchlist_fullscreen_empty_cta" />
        </View>
      );
    }

    return (
      <Box twClassName="flex-1">
        {hasActiveError ? (
          <WatchlistErrorRow onRetry={canRefresh ? refresh : undefined} />
        ) : null}
        <ReorderableList
          data={visibleItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onReorder={handleReorder}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          dragEnabled={isReorderEnabled}
          itemLayoutAnimation={layoutAnimation}
          ListFooterComponent={suggestedFooter}
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('pb-4')}
          showsVerticalScrollIndicator={false}
          testID={
            isMixedWatchlist
              ? WatchlistFullScreenViewSelectorsIDs.MIXED_LIST
              : WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST
          }
        />
      </Box>
    );
  }, [
    activeFilter,
    canRefresh,
    handleDragEnd,
    handleDragStart,
    handleReorder,
    hasActiveError,
    hasItems,
    hasSuggestions,
    isLoading,
    isMixedWatchlist,
    isReorderEnabled,
    isSearchMode,
    isSuggestedTokenLoading,
    keyExtractor,
    layoutAnimation,
    refresh,
    renderItem,
    suggestedFooter,
    tw,
    visibleItems,
  ]);

  return (
    <View
      style={tw.style('flex-1 bg-default')}
      testID={WatchlistFullScreenViewSelectorsIDs.CONTAINER}
    >
      {!isSearchMode ? (
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          onBack={handleBack}
          backButtonProps={{
            accessibilityLabel: strings('navigation.back'),
            testID: WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON,
          }}
          endAccessory={endAccessory}
          testID={WatchlistFullScreenViewSelectorsIDs.HEADER}
        />
      ) : null}

      {isSearchMode ? (
        <WatchlistSearchContent
          onDismiss={handleDismissSearch}
          activeFilter={activeFilter}
          canUseLivePerpsPrices={canUseLivePerpsPrices}
        />
      ) : (
        <>
          <View style={tw.style('px-4 pt-3 pb-2')}>
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              testID={WatchlistFullScreenViewSelectorsIDs.TITLE}
            >
              {strings('token_watchlist.fullscreen_title')}
            </Text>
          </View>

          {filterBar}
          {listContent}
        </>
      )}
    </View>
  );
};

interface WatchlistFullScreenViewProps {
  testStreamManager?: PerpsStreamManager;
}

const WatchlistFullScreenView = ({
  testStreamManager,
}: WatchlistFullScreenViewProps = {}) => {
  const isTokenWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const navigation = useNavigation<AppNavigationProp>();

  useEffect(() => {
    if (!isTokenWatchlistEnabled && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [isTokenWatchlistEnabled, navigation]);

  if (!isTokenWatchlistEnabled) {
    return null;
  }

  return (
    <WatchlistPerpsProvider testStreamManager={testStreamManager}>
      <WatchlistFullScreenViewContent />
    </WatchlistPerpsProvider>
  );
};

export default WatchlistFullScreenView;
