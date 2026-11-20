import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import ReorderableList, {
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { CaipAssetType } from '@metamask/utils';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  useTokenWatchlistRemoveItemMutation,
  useTokenWatchlistUpdateListMutation,
} from '../../hooks/useTokenWatchlistMutations';
import useTrackWatchlistPageViewed from '../../hooks/useTrackWatchlistPageViewed';
import { WatchlistAnalytics } from '../../constants/watchlistAnalytics';
import TrendingTokensSkeleton from '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEmptyCTA from '../../components/WatchlistEmptyCTA';
import WatchlistSearchContent from './WatchlistSearchContent';
import { useSelector } from 'react-redux';
import CapsuleGlass from '../../../../../../component-library/components-temp/CapsuleGlass';
import HeaderStandardGlass from '../../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import WatchlistPerpsProvider from '../../../../Watchlist/WatchlistPerpsProvider';
import { useUnifiedWatchlist } from '../../../../Watchlist/hooks/useUnifiedWatchlist';
import { reorderWatchlistItems } from '../../../../Watchlist/utils';
import type { UnifiedWatchlistItem } from '../../../../Watchlist/types';
import { usePerpsWatchlistActions } from '../../../../Perps/hooks/usePerpsWatchlistActions';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import WatchlistErrorRow from '../../../../Watchlist/WatchlistErrorRow';
import type { PerpsStreamManager } from '../../../../Perps/providers/PerpsStreamManager';
import WatchlistReorderableRow from './WatchlistReorderableRow';

const SKELETON_COUNT = 5;
const ANIMATION_DURATION = 250;

/** Header controls sit on the glass capsule; the default press fill would cover it. */
const HEADER_ICON_BUTTON_CLASS = 'bg-transparent';

const rowExitAnimation = FadeOut.duration(ANIMATION_DURATION);
const rowLayoutAnimation = LinearTransition.duration(ANIMATION_DURATION);

interface WatchlistFullViewRouteParams {
  source?: string;
}

const WatchlistFullScreenViewContent = () => {
  const reduceMotion = useReducedMotion();
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const routeParams = route.params as WatchlistFullViewRouteParams | undefined;
  const {
    isUnifiedEnabled,
    isPerpsEnabled,
    orderedItems,
    isOrderReady,
    orderError,
    tokens,
    perps,
    canUseLivePerpsPrices,
    canUseMotion,
    canRefresh,
    tokenCount,
    isTokenMetadataComplete,
    isInitialLoading,
    persistOrder,
    refresh,
  } = useUnifiedWatchlist();
  const shouldReduceMotion = reduceMotion || !canUseMotion;
  const exitAnimation = shouldReduceMotion ? undefined : rowExitAnimation;
  const layoutAnimation = shouldReduceMotion ? undefined : rowLayoutAnimation;
  const isMixedWatchlist = isUnifiedEnabled && isPerpsEnabled;
  const updateListMutation = useTokenWatchlistUpdateListMutation();
  const removeTokenMutation = useTokenWatchlistRemoveItemMutation();
  const { removeFromWatchlist: removePerpFromWatchlist } =
    usePerpsWatchlistActions(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const hasItems = orderedItems.length > 0;
  const hasError = Boolean(
    tokens.error || perps.error || (isMixedWatchlist && orderError),
  );
  const isEmpty = !isInitialLoading && !hasItems && !hasError;
  const isReorderEnabled =
    isTokenMetadataComplete && (!isMixedWatchlist || isOrderReady);

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

  const handleDismissSearch = useCallback(() => {
    setIsSearchMode(false);
  }, []);

  const handleSearchPress = useCallback(() => {
    setIsSearchMode(true);
  }, []);

  const handleRemoveFromWatchlist = useCallback(
    (item: UnifiedWatchlistItem) => {
      if (item.kind === 'token') {
        removeTokenMutation.mutate(item.assetId as CaipAssetType);
        return;
      }
      removePerpFromWatchlist(item.symbol).catch(() => undefined);
    },
    [removePerpFromWatchlist, removeTokenMutation],
  );

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      const nextItems = reorderWatchlistItems(orderedItems, from, to);
      if (isMixedWatchlist) {
        persistOrder(nextItems.map((item) => item.key)).catch(() => undefined);
        return;
      }

      const nextTokenOrder = nextItems
        .filter(
          (item): item is Extract<UnifiedWatchlistItem, { kind: 'token' }> =>
            item.kind === 'token',
        )
        .map((item) => item.assetId);
      updateListMutation.mutate(
        nextTokenOrder.slice().reverse() as CaipAssetType[],
      );
    },
    [isMixedWatchlist, orderedItems, persistOrder, updateListMutation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedWatchlistItem; index: number }) => (
      <Animated.View exiting={exitAnimation} layout={layoutAnimation}>
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
            isReorderEnabled && index < orderedItems.length - 1
              ? () => handleReorder({ from: index, to: index + 1 })
              : undefined
          }
        />
      </Animated.View>
    ),
    [
      canUseLivePerpsPrices,
      exitAnimation,
      handleRemoveFromWatchlist,
      handleReorder,
      isReorderEnabled,
      layoutAnimation,
      orderedItems.length,
    ],
  );

  const keyExtractor = useCallback(
    (item: UnifiedWatchlistItem) => item.key,
    [],
  );

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
  }, [handleSearchPress, isGlassHeader, isSearchMode]);

  const listContent = useMemo(() => {
    if (isSearchMode) {
      return null;
    }

    if (isInitialLoading && !hasItems) {
      return (
        <View style={tw.style('flex-1')}>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <TrendingTokensSkeleton
              key={`watchlist-fullscreen-skeleton-${index}`}
            />
          ))}
        </View>
      );
    }

    if (hasError && !hasItems) {
      return <WatchlistErrorRow onRetry={canRefresh ? refresh : undefined} />;
    }

    if (!hasItems) {
      return (
        <View style={tw.style('flex-1')}>
          <WatchlistEmptyCTA source="watchlist_fullscreen_empty_cta" />
        </View>
      );
    }

    return (
      <Box twClassName="flex-1">
        {hasError ? (
          <WatchlistErrorRow onRetry={canRefresh ? refresh : undefined} />
        ) : null}
        <ReorderableList
          data={orderedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onReorder={handleReorder}
          dragEnabled={isReorderEnabled}
          itemLayoutAnimation={layoutAnimation}
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
    canRefresh,
    handleReorder,
    hasError,
    hasItems,
    isInitialLoading,
    isMixedWatchlist,
    isReorderEnabled,
    isSearchMode,
    keyExtractor,
    layoutAnimation,
    orderedItems,
    refresh,
    renderItem,
    tw,
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
        <WatchlistSearchContent onDismiss={handleDismissSearch} />
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
}: WatchlistFullScreenViewProps = {}) => (
  <WatchlistPerpsProvider testStreamManager={testStreamManager}>
    <WatchlistFullScreenViewContent />
  </WatchlistPerpsProvider>
);

export default WatchlistFullScreenView;
