import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import ReorderableList, {
  type ReorderableListReorderEvent,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTokenWatchlistQuery } from '../../hooks/useTokenWatchlistQuery';
import { useTokenWatchlistUpdateListMutation } from '../../hooks/useTokenWatchlistMutations';
import useTrackWatchlistPageViewed from '../../hooks/useTrackWatchlistPageViewed';
import { WatchlistAnalytics } from '../../constants/watchlistAnalytics';
import { mapWatchlistTokenToTrendingAsset } from '../../../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEditableRow from './WatchlistEditableRow';
import WatchlistEmptyCTA from '../../components/WatchlistEmptyCTA';
import WatchlistSearchContent from './WatchlistSearchContent';
import { useWatchlistEditDraft } from './useWatchlistEditDraft';
import styleSheet from './WatchlistFullScreenView.styles';
import { useSelector } from 'react-redux';
import CapsuleGlass from '../../../../../../component-library/components-temp/CapsuleGlass';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import {
  selectTokenWatchlistEnabled,
  selectUnifiedWatchlistEnabled,
} from '../../../selectors/featureFlags';
import { selectPerpsEnabledFlag } from '../../../../Perps/selectors/featureFlags';
import { TEMPORARY_ENABLE_WATCHLIST_PERPS } from '../../../../Watchlist/watchlistFeatureOverrides';
import { useUnifiedWatchlist } from '../../../../Watchlist/hooks/useUnifiedWatchlist';
import type {
  UnifiedWatchlistItem,
  UnifiedWatchlistPerp,
} from '../../../../Watchlist/types';
import WatchlistUnavailablePerpRow from '../../../../Watchlist/WatchlistUnavailablePerpRow';
import WatchlistErrorRow from '../../../../Watchlist/WatchlistErrorRow';
import PerpsMarketRowItem from '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import { usePerpsNavigation } from '../../../../Perps/hooks/usePerpsNavigation';
import { usePerpsWatchlistActions } from '../../../../Perps/hooks/usePerpsWatchlistActions';
import { selectSelectedAccountGroupId } from '../../../../../../selectors/multichainAccounts/accountTreeController';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  PerpsStreamProvider,
  type PerpsStreamManager,
} from '../../../../Perps/providers/PerpsStreamManager';
const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;

/** Header controls sit on the glass capsule; the default press fill would cover it. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const rowExitAnimation = FadeOut.duration(ANIMATION_DURATION);
const rowLayoutAnimation = LinearTransition.duration(ANIMATION_DURATION);

interface WatchlistFullViewRouteParams {
  source?: string;
}

const restoreKeysAtBaselinePositions = (
  draftKeys: string[],
  baselineKeys: readonly string[],
  restoredKeys: ReadonlySet<string>,
): string[] => {
  const result = [...draftKeys];
  baselineKeys.forEach((key, index) => {
    if (restoredKeys.has(key) && !result.includes(key)) {
      result.splice(Math.min(index, result.length), 0, key);
    }
  });
  return result;
};

interface MixedPerpsRowProps {
  item: UnifiedWatchlistPerp;
  isEditMode: boolean;
  canUseLivePerpsPrices: boolean;
  onPress: (market: PerpsMarketData) => void;
  onRemove: () => void;
}

const MixedPerpsRow = ({
  item,
  isEditMode,
  canUseLivePerpsPrices,
  onPress,
  onRemove,
}: MixedPerpsRowProps): React.JSX.Element => {
  const { styles } = useStyles(styleSheet, {});
  const drag = useReorderableDrag();
  const rowClassName = isEditMode ? 'px-0' : '-mx-4 w-auto px-4';

  const row =
    item.status === 'resolved' ? (
      <PerpsMarketRowItem
        market={item.market}
        compact
        showBadge={false}
        enableLivePrices={canUseLivePerpsPrices}
        onPress={onPress}
        twClassName={rowClassName}
      />
    ) : (
      <WatchlistUnavailablePerpRow
        item={item}
        onRemove={onRemove}
        showRemoveAction={false}
        twClassName={rowClassName}
      />
    );

  if (!isEditMode) {
    return row;
  }

  return (
    <View style={styles.editableRow}>
      <Pressable
        style={styles.dragArea}
        onLongPress={drag}
        delayLongPress={300}
        testID={WatchlistFullScreenViewSelectorsIDs.DRAG_HANDLE}
        accessibilityRole="button"
        accessibilityLabel="Drag to reorder"
      >
        <View style={styles.dragHandle} pointerEvents="none">
          <Icon
            name={IconName.Menu}
            size={IconSize.Md}
            color={IconColor.IconMuted}
          />
        </View>
        <View style={styles.editableRowContent} pointerEvents="none">
          {row}
        </View>
      </Pressable>
      <View style={styles.unwatchStar}>
        <ButtonIcon
          iconName={IconName.Trash}
          size={ButtonIconSize.Md}
          onPress={onRemove}
          testID={WatchlistFullScreenViewSelectorsIDs.UNWATCH_STAR}
          accessibilityLabel="Remove from watchlist"
        />
      </View>
    </View>
  );
};

const LegacyWatchlistFullScreenView = (): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const { data, isLoading } = useTokenWatchlistQuery();
  const updateListMutation = useTokenWatchlistUpdateListMutation();
  const [isSearchMode, setIsSearchMode] = useState(false);

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
  const tokenCount = data?.length ?? 0;
  const isEmpty = !isLoading && !hasItems;

  useTrackWatchlistPageViewed({
    tokenCount,
    isEmpty,
    isLoading,
    source: routeParams?.source ?? WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
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
        />
      </Animated.View>
    ),
    [isEditMode, onRemoveFromDraft],
  );

  const keyExtractor = useCallback((item: TrendingAsset) => item.assetId, []);

  const endAccessory = useMemo(() => {
    if (isEditMode) {
      const doneButton = (
        <ButtonBase
          size={ButtonBaseSize.Md}
          onPress={handleDonePress}
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
          accessibilityLabel="Search"
          twClassName={HEADER_ICON_BUTTON_CLASS}
        />
        {hasItems ? (
          <ButtonIcon
            iconProps={{ color: IconColor.IconDefault }}
            iconName={IconName.Edit}
            size={ButtonIconSize.Md}
            onPress={handleEditPress}
            testID={WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON}
            accessibilityLabel={strings('token_watchlist.edit')}
            twClassName={HEADER_ICON_BUTTON_CLASS}
          />
        ) : null}
      </Box>
    );

    if (!isGlassHeader) {
      return headerActions;
    }

    return (
      <CapsuleGlass twClassName="shrink-0 px-2">{headerActions}</CapsuleGlass>
    );
  }, [
    isGlassHeader,
    handleDonePress,
    handleEditPress,
    handleSearchPress,
    hasItems,
    isEditMode,
  ]);

  const listContent = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    if (isLoading) {
      return (
        <View style={styles.listContainer}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <TrendingTokensSkeleton
              key={`watchlist-fullscreen-skeleton-${i}`}
            />
          ))}
        </View>
      );
    }

    if (!hasItems) {
      return (
        <View style={styles.emptyContentContainer}>
          <WatchlistEmptyCTA source="watchlist_fullscreen_empty_cta" />
        </View>
      );
    }

    return (
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
    );
  }, [
    displayTokens,
    handleReorder,
    hasItems,
    isEditMode,
    isLoading,
    isSearchMode,
    keyExtractor,
    renderItem,
    styles.emptyContentContainer,
    styles.listContainer,
    styles.listContainerEditMode,
  ]);

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
          onBack={isEditMode ? undefined : handleBack}
          backButtonProps={
            isEditMode
              ? undefined
              : {
                  accessibilityLabel: 'Back',
                  testID: WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON,
                }
          }
          endAccessory={endAccessory}
          testID={WatchlistFullScreenViewSelectorsIDs.HEADER}
        />
      ) : null}

      {isSearchMode ? (
        <WatchlistSearchContent onDismiss={handleDismissSearch} />
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

          {listContent}
        </>
      )}
    </View>
  );
};

const MixedWatchlistFullScreenView = (): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const accountGroupId = useSelector(selectSelectedAccountGroupId);
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const {
    items,
    tokens,
    perps,
    canUseLivePerpsPrices,
    canRefresh,
    tokenCount,
    isInitialLoading,
    isOrderReady,
    persistOrder,
    refresh,
  } = useUnifiedWatchlist();
  const updateTokenListMutation = useTokenWatchlistUpdateListMutation();
  const { removeFromWatchlist: removePerpFromWatchlist } =
    usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST, {
      showToasts: false,
    });
  const { navigateToMarketDetails } = usePerpsNavigation();
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [draftItems, setDraftItems] = useState<UnifiedWatchlistItem[] | null>(
    null,
  );
  const baselineItemsRef = useRef<UnifiedWatchlistItem[]>([]);
  const draftAccountGroupIdRef = useRef<string | null | undefined>(undefined);
  const isCommittingRef = useRef(false);
  const [commitError, setCommitError] = useState(false);
  const isEditMode = draftItems !== null;
  const {
    handleEditPress: handleTokenEditPress,
    handleDonePress: handleTokenDonePress,
    onRemoveFromDraft: onRemoveTokenFromDraft,
  } = useWatchlistEditDraft({
    queryTokens: tokens.items.map((token) => token.token),
    autoCommitWhenEmpty: false,
    reverseStorageOrder: false,
    updateListMutation: updateTokenListMutation,
  });

  const visibleItems = draftItems ?? items;

  const hasItems = visibleItems.length > 0;
  const hasError = Boolean(tokens.error || perps.error);
  const isEmpty = !isInitialLoading && !hasItems && !hasError;

  useEffect(() => {
    if (!isEditMode || draftAccountGroupIdRef.current === accountGroupId) {
      return;
    }

    baselineItemsRef.current = [];
    draftAccountGroupIdRef.current = undefined;
    setDraftItems(null);
    setCommitError(false);
  }, [accountGroupId, isEditMode]);

  useTrackWatchlistPageViewed({
    tokenCount,
    isEmpty,
    isLoading: isInitialLoading,
    source: routeParams?.source ?? WatchlistAnalytics.PAGE_VIEW_SOURCE.HOMEPAGE,
  });

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handlePerpPress = useCallback(
    (market: PerpsMarketData) => {
      navigateToMarketDetails(
        market,
        PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
      );
    },
    [navigateToMarketDetails],
  );

  const handleEditPress = useCallback(() => {
    if (!isOrderReady || isInitialLoading) {
      return;
    }
    baselineItemsRef.current = visibleItems;
    draftAccountGroupIdRef.current = accountGroupId;
    setCommitError(false);
    setDraftItems(visibleItems);
    handleTokenEditPress();
  }, [
    accountGroupId,
    handleTokenEditPress,
    isInitialLoading,
    isOrderReady,
    visibleItems,
  ]);

  const handleDonePress = useCallback(async () => {
    if (draftItems === null || isCommittingRef.current) {
      return;
    }

    isCommittingRef.current = true;
    const draftAccountGroupId = draftAccountGroupIdRef.current;
    const baselineItems = baselineItemsRef.current;
    const draftKeys = draftItems.map((item) => item.key);
    const draftKeySet = new Set(draftKeys);
    const removedTokenKeys = baselineItems
      .filter((item) => item.kind === 'token' && !draftKeySet.has(item.key))
      .map((item) => item.key);
    const removedPerps = baselineItems.filter(
      (item): item is UnifiedWatchlistPerp =>
        item.kind === 'perp' && !draftKeySet.has(item.key),
    );

    try {
      const [didCommitTokens, perpRemovalResults] = await Promise.all([
        handleTokenDonePress(),
        Promise.all(
          removedPerps.map(async (item) => ({
            key: item.key,
            didRemove: await removePerpFromWatchlist(item.symbol),
          })),
        ),
      ]);
      const restoredKeys = new Set(
        perpRemovalResults
          .filter(({ didRemove }) => !didRemove)
          .map(({ key }) => key),
      );
      if (!didCommitTokens) {
        removedTokenKeys.forEach((key) => restoredKeys.add(key));
      }
      const finalOrder = restoreKeysAtBaselinePositions(
        draftKeys,
        baselineItems.map((item) => item.key),
        restoredKeys,
      );

      if (draftAccountGroupIdRef.current !== draftAccountGroupId) {
        return;
      }

      if (isOrderReady) {
        await persistOrder(finalOrder);
      }
      setCommitError(false);
      baselineItemsRef.current = [];
      draftAccountGroupIdRef.current = undefined;
      setDraftItems(null);
    } catch {
      // Membership hooks already restore their own state on failure.
      if (draftAccountGroupIdRef.current === draftAccountGroupId) {
        setCommitError(true);
      }
    } finally {
      isCommittingRef.current = false;
    }
  }, [
    draftItems,
    handleTokenDonePress,
    isOrderReady,
    persistOrder,
    removePerpFromWatchlist,
  ]);

  const handleRemoveFromWatchlist = useCallback(
    (item: UnifiedWatchlistItem) => {
      setDraftItems(
        (currentItems) =>
          currentItems?.filter((currentItem) => currentItem.key !== item.key) ??
          null,
      );

      if (item.kind === 'token') {
        onRemoveTokenFromDraft(item.assetId);
      }
    },
    [onRemoveTokenFromDraft],
  );

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      if (!isOrderReady || draftItems === null) {
        return;
      }
      if (
        from < 0 ||
        to < 0 ||
        from >= draftItems.length ||
        to >= draftItems.length
      ) {
        return;
      }

      const nextItems = draftItems.slice();
      const [movedItem] = nextItems.splice(from, 1);
      if (!movedItem) {
        return;
      }

      nextItems.splice(to, 0, movedItem);
      setDraftItems(nextItems);
    },
    [draftItems, isOrderReady],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedWatchlistItem; index: number }) => {
      if (item.kind === 'token') {
        return (
          <WatchlistEditableRow
            token={item.token}
            position={index}
            isEditMode={isEditMode}
            onRemoveFromDraft={() => handleRemoveFromWatchlist(item)}
          />
        );
      }

      return (
        <MixedPerpsRow
          item={item}
          isEditMode={isEditMode}
          canUseLivePerpsPrices={canUseLivePerpsPrices}
          onPress={handlePerpPress}
          onRemove={() => handleRemoveFromWatchlist(item)}
        />
      );
    },
    [
      canUseLivePerpsPrices,
      handlePerpPress,
      handleRemoveFromWatchlist,
      isEditMode,
    ],
  );

  const endAccessory = useMemo(() => {
    if (isEditMode) {
      const doneButton = (
        <ButtonBase
          size={ButtonBaseSize.Md}
          onPress={handleDonePress}
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

    const searchButton = (
      <ButtonIcon
        iconProps={{ color: IconColor.IconDefault }}
        iconName={IconName.Search}
        size={ButtonIconSize.Md}
        onPress={() => setIsSearchMode(true)}
        testID={WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON}
        accessibilityLabel={strings('wallet.search_accessibility_label')}
        twClassName={HEADER_ICON_BUTTON_CLASS}
      />
    );
    const editButton =
      hasItems && isOrderReady && !isInitialLoading ? (
        <ButtonIcon
          iconProps={{ color: IconColor.IconDefault }}
          iconName={IconName.Edit}
          size={ButtonIconSize.Md}
          onPress={handleEditPress}
          testID={WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON}
          accessibilityLabel={strings('token_watchlist.edit')}
          twClassName={HEADER_ICON_BUTTON_CLASS}
        />
      ) : null;
    const headerActions = (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        {searchButton}
        {editButton}
      </Box>
    );

    return isGlassHeader ? (
      <CapsuleGlass twClassName="shrink-0 px-2">{headerActions}</CapsuleGlass>
    ) : (
      headerActions
    );
  }, [
    handleDonePress,
    handleEditPress,
    hasItems,
    isEditMode,
    isGlassHeader,
    isInitialLoading,
    isOrderReady,
  ]);

  const listContent = useMemo(() => {
    if (isInitialLoading && !hasItems) {
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

    if (hasError && !hasItems && !commitError) {
      return <WatchlistErrorRow onRetry={canRefresh ? refresh : undefined} />;
    }

    if (!hasItems && !isEditMode && !commitError) {
      return (
        <View style={styles.emptyContentContainer}>
          <WatchlistEmptyCTA source="watchlist_fullscreen_empty_cta" />
        </View>
      );
    }

    return (
      <View
        style={[
          styles.listContainer,
          isEditMode && styles.listContainerEditMode,
        ]}
      >
        {commitError ? (
          <WatchlistErrorRow
            message={strings('token_watchlist.save_error')}
            onRetry={handleDonePress}
          />
        ) : null}
        <ReorderableList
          data={visibleItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          onReorder={handleReorder}
          dragEnabled={isEditMode && isOrderReady}
          itemLayoutAnimation={isEditMode ? rowLayoutAnimation : undefined}
          showsVerticalScrollIndicator={false}
          testID={WatchlistFullScreenViewSelectorsIDs.MIXED_LIST}
        />
      </View>
    );
  }, [
    canRefresh,
    commitError,
    hasError,
    hasItems,
    handleDonePress,
    handleReorder,
    isInitialLoading,
    isEditMode,
    isOrderReady,
    refresh,
    renderItem,
    styles.emptyContentContainer,
    styles.listContainer,
    styles.listContainerEditMode,
    visibleItems,
  ]);

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
          onBack={isEditMode ? undefined : handleBack}
          backButtonProps={
            isEditMode
              ? undefined
              : {
                  accessibilityLabel: strings('navigation.back'),
                  testID: WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON,
                }
          }
          endAccessory={endAccessory}
          testID={WatchlistFullScreenViewSelectorsIDs.HEADER}
        />
      ) : null}

      {isSearchMode ? (
        <WatchlistSearchContent onDismiss={() => setIsSearchMode(false)} />
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
}: WatchlistFullScreenViewProps = {}): React.JSX.Element => {
  const isTokenWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const isUnifiedWatchlistEnabled =
    useSelector(selectUnifiedWatchlistEnabled) ||
    TEMPORARY_ENABLE_WATCHLIST_PERPS;
  const isPerpsEnabled =
    useSelector(selectPerpsEnabledFlag) || TEMPORARY_ENABLE_WATCHLIST_PERPS;

  if (
    !isTokenWatchlistEnabled ||
    !isUnifiedWatchlistEnabled ||
    !isPerpsEnabled
  ) {
    return <LegacyWatchlistFullScreenView />;
  }

  return (
    <PerpsStreamProvider testStreamManager={testStreamManager}>
      <MixedWatchlistFullScreenView />
    </PerpsStreamProvider>
  );
};

export default WatchlistFullScreenView;
