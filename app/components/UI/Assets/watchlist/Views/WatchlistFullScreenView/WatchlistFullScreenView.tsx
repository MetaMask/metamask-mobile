import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
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
import { useStyles } from '../../../../../../component-library/hooks';
import { useTokenWatchlistQuery } from '../../hooks/useTokenWatchlistQuery';
import {
  useTokenWatchlistAddItemMutation,
  useTokenWatchlistRemoveItemMutation,
  useTokenWatchlistUpdateListMutation,
} from '../../hooks/useTokenWatchlistMutations';
import { useSuggestedWatchlistItemsQuery } from '../../hooks/useSuggestedWatchlistItemsQuery';
import useTrackWatchlistPageViewed from '../../hooks/useTrackWatchlistPageViewed';
import {
  getWatchlistAssetType,
  WatchlistAnalytics,
} from '../../constants/watchlistAnalytics';
import type { WatchlistTokenWithBalance } from '../../utils/addBalanceToTokens';
import { mapWatchlistTokenToTrendingAsset } from '../../../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import WatchlistSuggestedSection from '../../../../../Views/Homepage/Sections/Watchlist/components/WatchlistSuggestedSection';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEditableRow from './WatchlistEditableRow';
import WatchlistReorderableRow from './WatchlistReorderableRow';
import WatchlistEmptyCTA from '../../components/WatchlistEmptyCTA';
import WatchlistSearchContent from './WatchlistSearchContent';
import { useWatchlistEditDraft } from './useWatchlistEditDraft';
import styleSheet from './WatchlistFullScreenView.styles';
import { useSelector } from 'react-redux';
import CapsuleGlass from '../../../../../../component-library/components-temp/CapsuleGlass';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import { selectIsUnifiedWatchlistActive } from '../../../selectors/featureFlags';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { useUnifiedWatchlist } from '../../../../Watchlist/hooks/useUnifiedWatchlist';
import { useUnifiedWatchlistPerpsHandlers } from '../../../../Watchlist/hooks/useUnifiedWatchlistPerpsHandlers';
import { useOptimisticPerpsWatchlist } from '../../../../Watchlist/hooks/useOptimisticPerpsWatchlist';
import type {
  UnifiedWatchlistItem,
  WatchlistFilter,
} from '../../../../Watchlist/types';
import {
  filterWatchlistItems,
  getPerpsWatchlistKey,
  getTokenWatchlistKey,
  reorderWatchlistItems,
  selectWatchlistSuggestions,
} from '../../../../Watchlist/utils';
import WatchlistErrorRow from '../../../../Watchlist/WatchlistErrorRow';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import {
  PerpsStreamProvider,
  type PerpsStreamManager,
} from '../../../../Perps/providers/PerpsStreamManager';

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;
const SUGGESTED_ITEMS_LIMIT = 10;
const MAX_WATCHED_ITEMS_FOR_SUGGESTIONS = 2;

const FILTER_BAR_STYLE: ViewStyle = {
  flexGrow: 0,
  flexShrink: 0,
};

/** Header controls sit on the glass capsule; the default press fill would cover it. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const rowEnterAnimation = FadeIn.duration(ANIMATION_DURATION);
const rowExitAnimation = FadeOut.duration(ANIMATION_DURATION);
const rowLayoutAnimation = LinearTransition.duration(ANIMATION_DURATION);

interface WatchlistFullViewRouteParams {
  source?: string;
}

interface WatchlistFullScreenShellProps {
  tokenCount: number;
  perpsCount?: number;
  isUnified?: boolean;
  activeFilter?: WatchlistFilter;
  canUseLivePerpsPrices?: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  hasItems: boolean;
  isEditMode?: boolean;
  canEdit?: boolean;
  onEditPress?: () => void;
  onDonePress?: () => Promise<void>;
  filterBar?: React.ReactNode;
  showInitialSkeletons: boolean;
  showEmptyCta: boolean;
  children: React.ReactNode;
}

const WatchlistFullScreenShell = ({
  tokenCount,
  perpsCount = 0,
  isUnified = false,
  activeFilter = 'tokens',
  canUseLivePerpsPrices = false,
  isLoading,
  isEmpty,
  hasItems,
  isEditMode = false,
  canEdit = false,
  onEditPress,
  onDonePress,
  filterBar,
  showInitialSkeletons,
  showEmptyCta,
  children,
}: WatchlistFullScreenShellProps): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const [isSearchMode, setIsSearchMode] = useState(false);

  useTrackWatchlistPageViewed({
    tokenCount,
    perpsCount,
    isEmpty,
    isLoading,
    source: routeParams?.source ?? WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
    activeTab: isUnified ? activeFilter : WatchlistAnalytics.ACTIVE_TAB.TOKENS,
    isUnified,
  });

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

  const endAccessory = useMemo(() => {
    if (isEditMode && onDonePress) {
      const doneButton = (
        <ButtonBase
          size={ButtonBaseSize.Md}
          onPress={() => {
            onDonePress().catch(() => undefined);
          }}
          testID={WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON}
          accessibilityLabel={strings('token_watchlist.done')}
          twClassName={isGlassHeader ? HEADER_ICON_BUTTON_CLASS : undefined}
        >
          {strings('token_watchlist.done')}
        </ButtonBase>
      );

      return isGlassHeader ? (
        <CapsuleGlass twClassName="shrink-0">{doneButton}</CapsuleGlass>
      ) : (
        doneButton
      );
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
        {hasItems && canEdit && onEditPress ? (
          <ButtonIcon
            iconProps={{ color: IconColor.IconDefault }}
            iconName={IconName.Edit}
            size={ButtonIconSize.Md}
            onPress={onEditPress}
            testID={WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON}
            accessibilityLabel={strings('token_watchlist.edit')}
            twClassName={HEADER_ICON_BUTTON_CLASS}
          />
        ) : null}
      </Box>
    );

    return isGlassHeader ? (
      <CapsuleGlass twClassName="shrink-0 px-2">{headerActions}</CapsuleGlass>
    ) : (
      headerActions
    );
  }, [
    canEdit,
    handleSearchPress,
    hasItems,
    isEditMode,
    isGlassHeader,
    onDonePress,
    onEditPress,
  ]);

  const headerBackHandler = isEditMode ? undefined : handleBack;

  const renderBody = (): React.ReactNode => {
    if (showInitialSkeletons) {
      return (
        <View style={styles.listContainer}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <TrendingTokensSkeleton
              key={`watchlist-fullscreen-skeleton-${index}`}
            />
          ))}
        </View>
      );
    }

    if (showEmptyCta) {
      return (
        <View style={styles.emptyContentContainer}>
          <WatchlistEmptyCTA source="watchlist_fullscreen_empty_cta" />
        </View>
      );
    }

    return children;
  };

  return (
    <View
      style={styles.container}
      testID={WatchlistFullScreenViewSelectorsIDs.CONTAINER}
    >
      {!isSearchMode ? (
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          onBack={headerBackHandler}
          backButtonProps={
            headerBackHandler
              ? {
                  accessibilityLabel: strings('navigation.back'),
                  testID: WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON,
                }
              : undefined
          }
          endAccessory={endAccessory}
          testID={WatchlistFullScreenViewSelectorsIDs.HEADER}
        />
      ) : null}

      {isSearchMode ? (
        <WatchlistSearchContent
          onDismiss={handleDismissSearch}
          activeFilter={isUnified ? activeFilter : 'tokens'}
          canUseLivePerpsPrices={canUseLivePerpsPrices}
        />
      ) : (
        <>
          <View style={styles.titleContainer}>
            <Text
              variant={TextVariant.HeadingLg}
              fontWeight={FontWeight.Bold}
              testID={WatchlistFullScreenViewSelectorsIDs.TITLE}
            >
              {strings('token_watchlist.fullscreen_title')}
            </Text>
          </View>
          {filterBar}
          {renderBody()}
        </>
      )}
    </View>
  );
};

const LegacyWatchlistFullScreenView = (): React.JSX.Element => {
  const { styles } = useStyles(styleSheet, {});
  const { data, isLoading } = useTokenWatchlistQuery();
  const updateListMutation = useTokenWatchlistUpdateListMutation();

  const queryTokens = useMemo(
    () => (data ?? []).slice().reverse().map(mapWatchlistTokenToTrendingAsset),
    [data],
  );

  const {
    isEditMode,
    displayTokens,
    handleEditPress,
    handleDonePress,
    onRemoveFromDraft,
    handleReorder,
  } = useWatchlistEditDraft({ queryTokens, updateListMutation });

  const hasItems = displayTokens.length > 0;
  const isEmpty = !isLoading && !hasItems;

  const renderItem = useCallback(
    ({ item, index }: { item: TrendingAsset; index: number }) => (
      <Animated.View
        exiting={isEditMode ? rowExitAnimation : undefined}
        layout={isEditMode ? rowLayoutAnimation : undefined}
      >
        <WatchlistEditableRow
          token={item}
          position={index}
          isEditMode={isEditMode}
          onRemoveFromDraft={onRemoveFromDraft}
          onMoveUp={
            isEditMode && index > 0
              ? (): void => handleReorder({ from: index, to: index - 1 })
              : undefined
          }
          onMoveDown={
            isEditMode && index < displayTokens.length - 1
              ? (): void => handleReorder({ from: index, to: index + 1 })
              : undefined
          }
        />
      </Animated.View>
    ),
    [displayTokens.length, handleReorder, isEditMode, onRemoveFromDraft],
  );

  const keyExtractor = useCallback((item: TrendingAsset) => item.assetId, []);

  return (
    <WatchlistFullScreenShell
      tokenCount={data?.length ?? 0}
      isLoading={isLoading}
      isEmpty={isEmpty}
      hasItems={hasItems}
      isEditMode={isEditMode}
      canEdit
      onEditPress={handleEditPress}
      onDonePress={async () => {
        await handleDonePress();
      }}
      showInitialSkeletons={isLoading}
      showEmptyCta={!hasItems}
    >
      <ReorderableList
        data={displayTokens}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onReorder={handleReorder}
        dragEnabled={isEditMode}
        itemLayoutAnimation={isEditMode ? rowLayoutAnimation : undefined}
        style={[
          styles.listContainer,
          isEditMode && styles.listContainerEditMode,
        ]}
        showsVerticalScrollIndicator={false}
        testID={WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST}
      />
    </WatchlistFullScreenShell>
  );
};

const MixedWatchlistFullScreenView = (): React.JSX.Element => {
  const tw = useTailwind();
  const reduceMotion = useReducedMotion();
  const {
    items: orderedItems,
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
    orderError,
    isInitialLoading,
    isOrderReady,
    persistOrder,
    appendOrderKey,
    refresh,
  } = useUnifiedWatchlist();
  const { data: suggestedTokenPool, isLoading: isSuggestedTokenLoading } =
    useSuggestedWatchlistItemsQuery({ enabled: canFetchSuggestions });
  const addTokenMutation = useTokenWatchlistAddItemMutation();
  const removeTokenMutation = useTokenWatchlistRemoveItemMutation();
  const analytics = useAnalytics();
  const {
    addPerpToWatchlist,
    removePerpFromWatchlist,
    handlePerpPress,
    retryHandler: retryLoadHandler,
  } = useUnifiedWatchlistPerpsHandlers({
    source: PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
    canRefresh,
    refresh,
  });

  const [activeFilter, setActiveFilter] = useState<WatchlistFilter>('all');
  const [isDragging, setIsDragging] = useState(false);

  const shouldReduceMotion = reduceMotion || !canUseMotion;
  const enterAnimation = shouldReduceMotion ? undefined : rowEnterAnimation;
  const exitAnimation = shouldReduceMotion ? undefined : rowExitAnimation;
  const layoutAnimation = shouldReduceMotion ? undefined : rowLayoutAnimation;

  const handlePerpAdded = useCallback(
    (symbol: string) => {
      if (isOrderReady) {
        appendOrderKey(getPerpsWatchlistKey(symbol)).catch(() => undefined);
      }
    },
    [appendOrderKey, isOrderReady],
  );

  const {
    displayOrderedItems,
    watchlistedPerpSymbols,
    hasPendingPerpMutations,
    addPerp: handleAddPerp,
    removePerp,
  } = useOptimisticPerpsWatchlist({
    orderedItems,
    persistedPerps: perps.items,
    perpsMembershipSymbols,
    addPerpToWatchlist,
    removePerpFromWatchlist,
    onPerpAdded: handlePerpAdded,
  });

  const visibleItems = useMemo(
    () => filterWatchlistItems(displayOrderedItems, activeFilter),
    [activeFilter, displayOrderedItems],
  );
  const hasItems = visibleItems.length > 0;
  let domainError: string | null;
  if (activeFilter === 'tokens') {
    domainError = tokens.error;
  } else if (activeFilter === 'perps') {
    domainError = perps.error;
  } else {
    domainError = tokens.error ?? perps.error;
  }
  const hasActiveError = Boolean(orderError ?? domainError);

  const displayedPerpsCount = watchlistedPerpSymbols.length;
  const watchedItemCount = displayOrderedItems.length;
  const hasWatchlist = watchedItemCount > 0;
  const remainingSuggestedCount = Math.max(
    0,
    SUGGESTED_ITEMS_LIMIT - watchedItemCount,
  );
  const canShowSuggestions =
    !isDragging &&
    watchedItemCount <= MAX_WATCHED_ITEMS_FOR_SUGGESTIONS &&
    remainingSuggestedCount > 0;

  const visibleSuggestions = useMemo(() => {
    if (!canShowSuggestions) {
      return [];
    }
    return selectWatchlistSuggestions(
      activeFilter !== 'perps' ? (suggestedTokenPool ?? []) : [],
      activeFilter !== 'tokens' ? suggestedPerps : [],
      {
        limit: remainingSuggestedCount,
        watchlistedTokenAssetIds: tokenMembershipAssetIds,
        watchlistedTokenSymbols: tokens.items.map((item) =>
          String(item.token.symbol),
        ),
        watchlistedPerpSymbols,
      },
    );
  }, [
    activeFilter,
    canShowSuggestions,
    remainingSuggestedCount,
    suggestedPerps,
    suggestedTokenPool,
    tokenMembershipAssetIds,
    tokens.items,
    watchlistedPerpSymbols,
  ]);
  const hasSuggestions = visibleSuggestions.length > 0;
  const isEmpty = !isInitialLoading && !hasItems && !hasActiveError;

  const handleAddToken = useCallback(
    (token: WatchlistTokenWithBalance) => {
      const assetId = String(token.assetId);
      addTokenMutation.mutate(token, {
        onSuccess: () => {
          analytics.trackEvent(
            analytics
              .createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_ADDED)
              .addProperties({
                source: WatchlistAnalytics.ADD_SOURCE.FULLSCREEN,
                asset_id: assetId,
                asset_type: getWatchlistAssetType(assetId),
                has_balance: token.isInWallet,
              })
              .build(),
          );
          if (isOrderReady) {
            appendOrderKey(getTokenWatchlistKey(assetId)).catch(
              () => undefined,
            );
          }
        },
      });
    },
    [addTokenMutation, analytics, appendOrderKey, isOrderReady],
  );

  const handleRemoveFromWatchlist = useCallback(
    (item: UnifiedWatchlistItem) => {
      if (item.kind === 'token') {
        removeTokenMutation.mutate(item.assetId as CaipAssetType, {
          onSuccess: () => {
            analytics.trackEvent(
              analytics
                .createEventBuilder(MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED)
                .addProperties({
                  source: WatchlistAnalytics.REMOVE_SOURCE.FULLSCREEN,
                  asset_id: item.assetId,
                  asset_type: getWatchlistAssetType(item.assetId),
                })
                .build(),
            );
          },
        });
        return;
      }

      removePerp(item.symbol);
    },
    [analytics, removePerp, removeTokenMutation],
  );

  const handleDragStart = useCallback(() => {
    'worklet';
    scheduleOnRN(setIsDragging, true);
  }, []);

  const handleDragEnd = useCallback(() => {
    'worklet';
    scheduleOnRN(setIsDragging, false);
  }, []);

  const handleFilterChange = useCallback(
    (value: string) => {
      const filter = value as WatchlistFilter;
      setActiveFilter(filter);

      analytics.trackEvent(
        analytics
          .createEventBuilder(
            MetaMetricsEvents.UNIFIED_WATCHLIST_FILTER_SELECTED,
          )
          .addProperties({
            filter,
            token_count: tokenCount,
            perps_count: displayedPerpsCount,
          })
          .build(),
      );
    },
    [analytics, displayedPerpsCount, tokenCount],
  );

  const latestOrderedItemsRef = useRef(displayOrderedItems);
  latestOrderedItemsRef.current = displayOrderedItems;

  const isReorderEnabled =
    activeFilter === 'all' &&
    isOrderReady &&
    !isInitialLoading &&
    !hasPendingPerpMutations &&
    displayOrderedItems.length > 1;

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      if (!isReorderEnabled) {
        return;
      }
      const nextItems = reorderWatchlistItems(
        latestOrderedItemsRef.current,
        from,
        to,
      );
      latestOrderedItemsRef.current = nextItems;
      persistOrder(nextItems.map((item) => item.key)).catch(() => undefined);
    },
    [isReorderEnabled, persistOrder],
  );

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
          itemCount={visibleItems.length}
          isDragEnabled={isReorderEnabled}
          canUseLivePerpsPrices={canUseLivePerpsPrices}
          onPerpPress={handlePerpPress}
          onRemoveFromWatchlist={handleRemoveFromWatchlist}
          onReorder={handleReorder}
        />
      </Animated.View>
    ),
    [
      canUseLivePerpsPrices,
      enterAnimation,
      exitAnimation,
      handlePerpPress,
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
          headerTwClassName="mb-1 px-4 pt-2"
          onPerpPress={handlePerpPress}
          onAddPerpPress={handleAddPerp}
          canUseLivePerpsPrices={canUseLivePerpsPrices}
          enableMotion={canUseMotion}
          showTypeTag
        />
      </Animated.View>
    );
  }, [
    canUseLivePerpsPrices,
    canUseMotion,
    handleAddPerp,
    handleAddToken,
    handlePerpPress,
    hasSuggestions,
    hasWatchlist,
    layoutAnimation,
    visibleSuggestions,
  ]);

  const filterBar = useMemo(
    () => (
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
    ),
    [activeFilter, handleFilterChange],
  );

  const renderContent = (): React.ReactNode => {
    if (!hasItems && hasActiveError && !hasSuggestions) {
      return (
        <WatchlistErrorRow onRetry={retryLoadHandler} twClassName="px-4" />
      );
    }

    if (
      !hasItems &&
      !hasSuggestions &&
      (activeFilter === 'perps' || (activeFilter === 'tokens' && hasWatchlist))
    ) {
      const emptyTitleKey =
        activeFilter === 'perps'
          ? 'perps.no_favorites_found'
          : 'token_watchlist.no_tokens_found';
      const emptyDescriptionKey =
        activeFilter === 'perps'
          ? 'perps.no_favorites_description'
          : 'token_watchlist.no_tokens_description';
      return (
        <Box
          twClassName="flex-1 items-center justify-center px-4"
          testID={WatchlistFullScreenViewSelectorsIDs.MIXED_LIST}
        >
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings(emptyTitleKey)}
          </Text>
          <Text twClassName="mt-2 text-center">
            {strings(emptyDescriptionKey)}
          </Text>
        </Box>
      );
    }

    if (!hasItems && !hasSuggestions && isSuggestedTokenLoading) {
      return (
        <View style={tw.style('flex-1 px-4')}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <TrendingTokensSkeleton
              key={`watchlist-suggested-skeleton-${index}`}
            />
          ))}
        </View>
      );
    }

    return (
      <Box twClassName="flex-1">
        {hasActiveError ? (
          <WatchlistErrorRow onRetry={retryLoadHandler} twClassName="px-4" />
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
          testID={WatchlistFullScreenViewSelectorsIDs.MIXED_LIST}
        />
      </Box>
    );
  };
  return (
    <WatchlistFullScreenShell
      tokenCount={tokenCount}
      perpsCount={displayedPerpsCount}
      isUnified
      activeFilter={activeFilter}
      canUseLivePerpsPrices={canUseLivePerpsPrices}
      isLoading={isInitialLoading}
      isEmpty={isEmpty}
      hasItems={hasItems}
      filterBar={filterBar}
      showInitialSkeletons={isInitialLoading && !hasItems}
      showEmptyCta={
        !hasWatchlist &&
        !hasSuggestions &&
        !hasActiveError &&
        activeFilter !== 'perps' &&
        !isSuggestedTokenLoading
      }
    >
      {renderContent()}
    </WatchlistFullScreenShell>
  );
};

interface WatchlistFullScreenViewProps {
  testStreamManager?: PerpsStreamManager;
}

const WatchlistFullScreenView = ({
  testStreamManager,
}: WatchlistFullScreenViewProps = {}): React.JSX.Element => {
  const isUnifiedWatchlistActive = useSelector(selectIsUnifiedWatchlistActive);

  if (!isUnifiedWatchlistActive) {
    return <LegacyWatchlistFullScreenView />;
  }

  return (
    <PerpsStreamProvider testStreamManager={testStreamManager}>
      <MixedWatchlistFullScreenView />
    </PerpsStreamProvider>
  );
};

export default WatchlistFullScreenView;
