import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  SharedValue,
  interpolate,
  Extrapolation,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { FlashList, FlashListProps, FlashListRef } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import {
  PredictCategory,
  PredictMarket as PredictMarketType,
} from '../../types';
import { PredictEntryPoint } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarket from '../../components/PredictMarket';
import PredictMarketSkeleton from '../../components/PredictMarketSkeleton';
import { PredictBalance } from '../../components/PredictBalance';
import PredictOffline from '../../components/PredictOffline';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import Routes from '../../../../../constants/navigation/Routes';
import {
  TabItem,
  TabsBar,
} from '../../../../../component-library/components-temp/Tabs';

// =============================================================================
// TYPES
// =============================================================================

interface FeedTab {
  key: PredictCategory;
  label: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TABS: FeedTab[] = [
  { key: 'trending', label: strings('predict.category.trending') },
  { key: 'new', label: strings('predict.category.new') },
  { key: 'sports', label: strings('predict.category.sports') },
  { key: 'crypto', label: strings('predict.category.crypto') },
  { key: 'politics', label: strings('predict.category.politics') },
];

// Create AnimatedFlashList once at module scope
// FlashList ref type for scroll management
type PredictFlashListRef = FlashListRef<PredictMarketType>;
type PredictFlashListProps = FlashListProps<PredictMarketType> & {
  ref?: React.Ref<PredictFlashListRef>;
};

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<PredictFlashListProps>,
) as unknown as React.ComponentType<PredictFlashListProps>;

// =============================================================================
// HOOKS
// =============================================================================

interface UseFeedScrollManagerParams {
  tabs: FeedTab[];
  headerRef: React.RefObject<View>;
  tabBarRef: React.RefObject<View>;
}

interface UseFeedScrollManagerReturn {
  headerTranslateY: SharedValue<number>;
  isHeaderHidden: SharedValue<number>;
  headerHidden: boolean;
  headerHeight: number;
  tabBarHeight: number;
  layoutReady: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  trackRef: (tabKey: string, ref: PredictFlashListRef | null) => void;
  getCurrentHeaderOffset: () => number;
  onScrollEnd: () => void;
  updateTabScrollPosition: (tabKey: string, position: number) => void;
  getTabScrollPosition: (tabKey: string) => number;
}

/**
 * Manages time-based header animation with binary show/hide states.
 * Scroll direction triggers animated transitions - header is always fully visible or hidden.
 */
const HEADER_ANIMATION_DURATION = 450;
const SCROLL_THRESHOLD = 250;

const useFeedScrollManager = ({
  headerRef,
  tabBarRef,
}: UseFeedScrollManagerParams): UseFeedScrollManagerReturn => {
  // Header state: 0 = visible, 1 = hidden (binary, not continuous)
  const isHeaderHidden = useSharedValue(0);
  // Header translateY: 0 = visible, -headerHeight = hidden
  const headerTranslateY = useSharedValue(0);

  // Shared values for worklet access
  const sharedHeaderHeight = useSharedValue(0);
  const sharedTabBarHeight = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  // Flag to skip direction detection on first scroll after tab switch
  const isTabSwitching = useSharedValue(false);

  // Track accumulated scroll delta for threshold detection
  const accumulatedDelta = useSharedValue(0);
  const lastDirection = useSharedValue(0); // 1 = down, -1 = up, 0 = none

  // Layout measurements (JS side)
  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);

  // Tab state
  const [activeIndex, setActiveIndex] = useState(0);

  // React state mirror of isHeaderHidden for reactive UI updates
  const [headerHidden, setHeaderHidden] = useState(false);

  // Track refs and scroll positions for each tab
  const tabKeyToRef = useRef<Record<string, PredictFlashListRef>>({});
  const tabKeyToScrollPosition = useRef<Record<string, number>>({});

  // Measure heights using useLayoutEffect
  // Retry mechanism ensures we get measurements even if initial render hasn't completed
  useLayoutEffect(() => {
    let headerMeasured = false;
    let tabBarMeasured = false;
    let retryCount = 0;
    const maxRetries = 10;

    const checkLayoutReady = () => {
      if (headerMeasured && tabBarMeasured && !layoutReady) {
        setLayoutReady(true);
      }
    };

    const measureHeights = () => {
      if (headerRef.current) {
        headerRef.current.measure((_x, _y, _width, height) => {
          if (height > 0) {
            setHeaderHeight(height);
            sharedHeaderHeight.value = height;
            headerMeasured = true;
            checkLayoutReady();
          }
        });
      }

      if (tabBarRef.current) {
        tabBarRef.current.measure((_x, _y, _width, height) => {
          if (height > 0) {
            setTabBarHeight(height);
            sharedTabBarHeight.value = height;
            tabBarMeasured = true;
            checkLayoutReady();
          }
        });
      }

      // Retry if measurements failed and we haven't exceeded max retries
      if ((!headerMeasured || !tabBarMeasured) && retryCount < maxRetries) {
        retryCount++;
        setTimeout(measureHeights, 50);
      }
    };

    // Initial measurement attempt
    const timeoutId = setTimeout(measureHeights, 50);
    return () => clearTimeout(timeoutId);
  }, [
    headerRef,
    tabBarRef,
    layoutReady,
    sharedHeaderHeight,
    sharedTabBarHeight,
  ]);

  // Track ref for a tab
  const trackRef = useCallback(
    (tabKey: string, ref: PredictFlashListRef | null) => {
      if (ref) {
        tabKeyToRef.current[tabKey] = ref;
      } else {
        delete tabKeyToRef.current[tabKey];
      }
    },
    [],
  );

  // Update scroll position for a tab
  const updateTabScrollPosition = useCallback(
    (tabKey: string, position: number) => {
      tabKeyToScrollPosition.current[tabKey] = position;
    },
    [],
  );

  // Get scroll position for a tab
  const getTabScrollPosition = useCallback(
    (tabKey: string) => tabKeyToScrollPosition.current[tabKey] ?? 0,
    [],
  );

  // Get current header offset (0 = visible, headerHeight = hidden)
  const getCurrentHeaderOffset = useCallback(
    () => -headerTranslateY.value,
    [headerTranslateY],
  );

  const onScrollEnd = useCallback(() => undefined, []);

  const animationConfig = {
    duration: HEADER_ANIMATION_DURATION,
    easing: Easing.out(Easing.cubic),
  };

  // Time-based scroll handler: detect direction, animate to show/hide
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const currentY = event.contentOffset.y;

      if (isTabSwitching.value) {
        isTabSwitching.value = false;
        lastScrollY.value = currentY;
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        return;
      }

      const delta = currentY - lastScrollY.value;
      lastScrollY.value = currentY;

      // At top of list - always show header
      const contentInsetTop =
        sharedHeaderHeight.value + sharedTabBarHeight.value;
      const atTop =
        Platform.OS === 'ios' ? currentY < 0 : currentY < contentInsetTop;

      if (atTop && isHeaderHidden.value === 1) {
        isHeaderHidden.value = 0;
        headerTranslateY.value = withTiming(0, animationConfig);
        accumulatedDelta.value = 0;
        lastDirection.value = 0;
        runOnJS(setHeaderHidden)(false);
        return;
      }

      const currentDirection = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if (currentDirection === 0) return;

      if (currentDirection !== lastDirection.value) {
        lastDirection.value = currentDirection;
        accumulatedDelta.value = 0;
      }

      accumulatedDelta.value += Math.abs(delta);

      if (accumulatedDelta.value < SCROLL_THRESHOLD) {
        return;
      }

      // Scrolling down → hide header
      if (currentDirection === 1 && isHeaderHidden.value === 0) {
        isHeaderHidden.value = 1;
        headerTranslateY.value = withTiming(
          -sharedHeaderHeight.value,
          animationConfig,
        );
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(true);
      }

      // Scrolling up → show header
      if (currentDirection === -1 && isHeaderHidden.value === 1) {
        isHeaderHidden.value = 0;
        headerTranslateY.value = withTiming(0, animationConfig);
        accumulatedDelta.value = 0;
        runOnJS(setHeaderHidden)(false);
      }
    },
  });

  const handleSetActiveIndex = useCallback(
    (index: number) => {
      isTabSwitching.value = true;
      setActiveIndex(index);
    },
    [isTabSwitching],
  );

  return {
    headerTranslateY,
    isHeaderHidden,
    headerHidden,
    headerHeight,
    tabBarHeight,
    layoutReady,
    activeIndex,
    setActiveIndex: handleSetActiveIndex,
    scrollHandler,
    trackRef,
    getCurrentHeaderOffset,
    onScrollEnd,
    updateTabScrollPosition,
    getTabScrollPosition,
  };
};

// =============================================================================
// PURE UI COMPONENTS (no animation knowledge)
// =============================================================================

const PredictNavBackButton: React.FC = () => {
  const navigation = useNavigation();

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(
        Routes.WALLET.HOME as never,
        {
          screen: Routes.WALLET.TAB_STACK_FLOW,
          params: {
            screen: Routes.WALLET_VIEW,
          },
        } as never,
      );
    }
  }, [navigation]);

  return (
    <Pressable testID="predict-back-button" onPress={handleBackPress}>
      <Icon
        name={IconName.ArrowLeft}
        size={IconSize.Lg}
        color={IconColor.IconDefault}
      />
    </Pressable>
  );
};

const PredictNavTitle: React.FC = () => (
  <Text variant={TextVariant.HeadingLg}>Predictions</Text>
);

const PredictNavSearchButton: React.FC<{ onPress: () => void }> = ({
  onPress,
}) => (
  <Pressable testID="predict-search-button" onPress={onPress}>
    <Icon
      name={IconName.Search}
      size={IconSize.Lg}
      color={IconColor.IconDefault}
    />
  </Pressable>
);

interface PredictFeedTopNavProps {
  onSearchPress: () => void;
}

const PredictFeedTopNav: React.FC<PredictFeedTopNavProps> = ({
  onSearchPress,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="w-full px-4 py-2"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <PredictNavBackButton />
      <PredictNavTitle />
    </Box>
    <PredictNavSearchButton onPress={onSearchPress} />
  </Box>
);

/**
 * Pure header UI component - renders balance info.
 * Has no knowledge of animation or positioning.
 */
const PredictFeedHeader: React.FC = () => (
  <Box twClassName="py-4">
    <PredictBalance />
  </Box>
);

/**
 * Pure tab bar UI component - renders tab buttons.
 * Has no knowledge of animation or positioning.
 */
interface PredictFeedTabBarProps {
  tabs: FeedTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

const PredictFeedTabBar: React.FC<PredictFeedTabBarProps> = ({
  tabs,
  activeIndex,
  onTabPress,
}) => {
  const tabItems: TabItem[] = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.key,
        label: tab.label,
        content: null,
      })),
    [tabs],
  );

  return (
    <TabsBar
      tabs={tabItems}
      activeIndex={activeIndex}
      onTabPress={onTabPress}
      testID="predict-feed-tabs"
    />
  );
};

// =============================================================================
// ANIMATED HEADER (handles scroll-driven positioning)
// =============================================================================

interface AnimatedHeaderProps {
  headerTranslateY: SharedValue<number>;
  headerHeight: number;
  headerRef: React.RefObject<View>;
  tabBarRef: React.RefObject<View>;
  tabs: FeedTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

/**
 * Animated header containing both balance and tab bar.
 * The balance section scrolls away (with fade) while tab bar pins to top.
 *
 * Animation: Container translates from 0 to -headerHeight (balance height).
 * When fully translated, balance is hidden above viewport, tab bar is at y=0.
 */
const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  headerTranslateY,
  headerHeight,
  headerRef,
  tabBarRef,
  tabs,
  activeIndex,
  onTabPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  // Fade out balance as header hides: opacity 1 -> 0 as translateY 0 -> -headerHeight
  // Only interpolate after headerHeight is measured, otherwise keep full opacity
  const animatedBalanceStyle = useAnimatedStyle(() => ({
    opacity:
      headerHeight > 0
        ? interpolate(
            headerTranslateY.value,
            [-headerHeight, 0],
            [0, 1],
            Extrapolation.CLAMP,
          )
        : 1,
  }));

  return (
    <Animated.View
      style={[
        tw.style('absolute top-0 left-0 right-0 z-10'),
        { backgroundColor: colors.background.default },
        animatedContainerStyle,
      ]}
    >
      <Animated.View ref={headerRef} style={animatedBalanceStyle}>
        <PredictFeedHeader />
      </Animated.View>
      <View ref={tabBarRef}>
        <PredictFeedTabBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={onTabPress}
        />
      </View>
    </Animated.View>
  );
};

// =============================================================================
// COMPONENTS - Market List Item
// =============================================================================

interface PredictMarketListItemProps {
  market: PredictMarketType;
  entryPoint: PredictEntryPoint;
  testID?: string;
}

const PredictMarketListItem: React.FC<PredictMarketListItemProps> = ({
  market,
  entryPoint,
  testID,
}) => <PredictMarket market={market} entryPoint={entryPoint} testID={testID} />;

// =============================================================================
// COMPONENTS - Tab Content
// =============================================================================

interface PredictTabContentProps {
  tabKey: string;
  category: PredictCategory;
  isActive: boolean;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerHeight: number;
  tabBarHeight: number;
  headerHidden: boolean;
  trackRef: (tabKey: string, ref: PredictFlashListRef | null) => void;
  onScrollEnd: () => void;
}

const PredictTabContent: React.FC<PredictTabContentProps> = ({
  tabKey,
  category,
  isActive,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerHidden,
  trackRef,
  onScrollEnd,
}) => {
  const tw = useTailwind();
  const listRef = useRef<PredictFlashListRef>(null);

  // Track if tab has ever been active - delays FlashList mount until first activation
  // This ensures contentOffset prop is applied correctly (not ignored for pre-mounted invisible tabs)
  const [hasEverBeenActive, setHasEverBeenActive] = useState(isActive);
  useEffect(() => {
    if (isActive && !hasEverBeenActive) {
      setHasEverBeenActive(true);
    }
  }, [isActive, hasEverBeenActive]);

  const {
    marketData,
    isFetching,
    error,
    hasMore,
    refetch,
    fetchMore,
    isFetchingMore,
  } = usePredictMarketData({ category, pageSize: 20 });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Register ref with scroll manager
  useEffect(() => {
    trackRef(tabKey, listRef.current);
    return () => trackRef(tabKey, null);
  }, [tabKey, trackRef]);

  // With binary header state, offset calculations are simple
  const contentInsetTop = headerHeight + tabBarHeight;
  const currentHeaderOffset = headerHidden ? headerHeight : 0;

  // Padding for non-scrollable content (loading/error/empty states)
  const currentPaddingTop = headerHidden ? tabBarHeight : contentInsetTop;

  // Initial content offset - computed fresh each render, FlashList only uses on mount
  const initialContentOffset = Platform.select({
    ios: { x: 0, y: headerHidden ? -tabBarHeight : -contentInsetTop },
    android: { x: 0, y: currentHeaderOffset },
  });

  const renderItem = useCallback(
    (info: { item: PredictMarketType; index: number }) => (
      <PredictMarketListItem
        market={info.item}
        entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
        testID={`predict-market-${category}-${info.index}`}
      />
    ),
    [category],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  const handleEndReached = useCallback(() => {
    if (hasMore && !isFetchingMore) {
      fetchMore();
    }
  }, [hasMore, isFetchingMore, fetchMore]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const renderFooter = useCallback(() => {
    if (!isFetchingMore) return null;
    return (
      <Box twClassName="py-2">
        <PredictMarketSkeleton testID={`skeleton-footer-${category}-1`} />
        <PredictMarketSkeleton testID={`skeleton-footer-${category}-2`} />
      </Box>
    );
  }, [isFetchingMore, category]);

  // Platform-specific content container styling
  const contentContainerStyle = useMemo(
    () =>
      tw.style(
        'pb-4 px-4',
        Platform.select({
          ios: { flexGrow: 1 },
          android: {
            flexGrow: 1,
            paddingTop: headerHidden ? tabBarHeight : contentInsetTop,
          },
        }),
      ),
    [tw, headerHidden, tabBarHeight, contentInsetTop],
  );

  if (!hasEverBeenActive || (isFetching && !isRefreshing && !isFetchingMore)) {
    return (
      <Box twClassName="flex-1 px-4" style={{ paddingTop: currentPaddingTop }}>
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-1`} />
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-2`} />
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-3`} />
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-4`} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ paddingTop: currentPaddingTop }}>
        <PredictOffline onRetry={handleRefresh} />
      </Box>
    );
  }

  if (!marketData || marketData.length === 0) {
    return (
      <Box
        testID={`predict-empty-state-${category}`}
        twClassName="flex-1 justify-center items-center p-8"
        style={{ paddingTop: currentPaddingTop }}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryAlternative}>
          {strings('predict.search_empty_state', { category })}
        </Text>
      </Box>
    );
  }

  return (
    <AnimatedFlashList
      ref={listRef}
      data={marketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={renderFooter}
      onScroll={isActive ? (scrollHandler as never) : undefined}
      onScrollEndDrag={onScrollEnd}
      onMomentumScrollEnd={onScrollEnd}
      contentInset={Platform.select({ ios: { top: contentInsetTop } })}
      contentOffset={initialContentOffset}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          progressViewOffset={contentInsetTop}
        />
      }
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      getItemType={() => 'market'}
    />
  );
};

// =============================================================================
// COMPONENTS - Tabs Container (Lazy Loading)
// =============================================================================

interface PredictFeedTabsProps {
  activeIndex: number;
  onPageChange: (index: number) => void;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerHeight: number;
  tabBarHeight: number;
  headerHidden: boolean;
  trackRef: (tabKey: string, ref: PredictFlashListRef | null) => void;
  onScrollEnd: () => void;
}

const PredictFeedTabs: React.FC<PredictFeedTabsProps> = ({
  activeIndex,
  onPageChange,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerHidden,
  trackRef,
  onScrollEnd,
}) => {
  const tw = useTailwind();
  const pagerRef = useRef<PagerView>(null);

  // Sync PagerView when activeIndex changes from tab bar tap
  useEffect(() => {
    pagerRef.current?.setPage(activeIndex);
  }, [activeIndex]);

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      onPageChange(e.nativeEvent.position);
    },
    [onPageChange],
  );

  return (
    <PagerView
      ref={pagerRef}
      style={tw.style('flex-1')}
      initialPage={0}
      onPageSelected={handlePageSelected}
    >
      {TABS.map((tab, index) => (
        <View key={tab.key} style={tw.style('flex-1')}>
          <PredictTabContent
            tabKey={tab.key}
            category={tab.key}
            isActive={index === activeIndex}
            scrollHandler={scrollHandler}
            headerHeight={headerHeight}
            tabBarHeight={tabBarHeight}
            headerHidden={headerHidden}
            trackRef={trackRef}
            onScrollEnd={onScrollEnd}
          />
        </View>
      ))}
    </PagerView>
  );
};

// =============================================================================
// COMPONENTS - Search Overlay
// =============================================================================

interface PredictSearchOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const PredictSearchOverlay: React.FC<PredictSearchOverlayProps> = ({
  isVisible,
  onClose,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const { marketData, isFetching, error, refetch } = usePredictMarketData({
    category: 'trending',
    q: searchQuery,
    pageSize: 20,
  });

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleCancel = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    (info: { item: PredictMarketType; index: number }) => (
      <PredictMarketListItem
        market={info.item}
        entryPoint={PredictEventValues.ENTRY_POINT.SEARCH}
        testID={`predict-search-result-${info.index}`}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: PredictMarketType) => item.id, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      style={tw.style('absolute inset-0 z-20', {
        paddingTop: insets.top,
        backgroundColor: colors.background.default,
      })}
    >
      {/* Search Bar */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full py-2 px-4 gap-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 bg-muted rounded-lg px-3 py-2"
        >
          <Icon
            testID="search-icon"
            name={IconName.Search}
            size={IconSize.Sm}
            color={IconColor.IconMuted}
            style={tw.style('mr-2')}
          />
          <TextInput
            placeholder={strings('predict.search_placeholder')}
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={handleSearch}
            style={tw.style('flex-1 text-base text-default')}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable testID="clear-button" onPress={() => handleSearch('')}>
              <Icon
                name={IconName.CircleX}
                size={IconSize.Md}
                color={IconColor.IconMuted}
              />
            </Pressable>
          )}
        </Box>
        <Pressable onPress={handleCancel}>
          <Text variant={TextVariant.BodyMd} style={tw.style('font-medium')}>
            {strings('predict.search_cancel')}
          </Text>
        </Pressable>
      </Box>

      {/* Search Results */}
      {searchQuery.length > 0 && (
        <Box twClassName="flex-1">
          {isFetching ? (
            <Box twClassName="px-4 pt-4">
              <PredictMarketSkeleton testID="search-skeleton-1" />
              <PredictMarketSkeleton testID="search-skeleton-2" />
              <PredictMarketSkeleton testID="search-skeleton-3" />
            </Box>
          ) : error ? (
            <PredictOffline onRetry={refetch} />
          ) : marketData.length === 0 ? (
            <Box twClassName="flex-1 justify-center items-center p-8">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.PrimaryAlternative}
              >
                {strings('predict.search_no_markets_found', { q: searchQuery })}
              </Text>
            </Box>
          ) : (
            <FlashList<PredictMarketType>
              data={marketData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={tw.style('px-4 pt-4 pb-4')}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PredictFeed: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Refs for measuring component heights
  const headerRef = useRef<View>(null);
  const tabBarRef = useRef<View>(null);

  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const {
    headerTranslateY,
    headerHidden,
    headerHeight,
    tabBarHeight,
    layoutReady,
    activeIndex,
    setActiveIndex,
    scrollHandler,
    trackRef,
    onScrollEnd,
  } = useFeedScrollManager({ tabs: TABS, headerRef, tabBarRef });

  return (
    <Box
      twClassName="flex-1"
      style={{ backgroundColor: colors.background.default }}
    >
      {/* Top Nav - Static, highest z-index to stay above header */}
      <Box
        style={tw.style('z-20', {
          backgroundColor: colors.background.default,
          paddingTop: insets.top,
        })}
      >
        <PredictFeedTopNav onSearchPress={() => setIsSearchVisible(true)} />
      </Box>

      <Box twClassName="flex-1 relative">
        {/* Animated Header - Contains balance and tab bar */}
        <AnimatedHeader
          headerTranslateY={headerTranslateY}
          headerHeight={headerHeight}
          headerRef={headerRef}
          tabBarRef={tabBarRef}
          tabs={TABS}
          activeIndex={activeIndex}
          onTabPress={setActiveIndex}
        />

        {layoutReady && (
          <PredictFeedTabs
            activeIndex={activeIndex}
            onPageChange={setActiveIndex}
            scrollHandler={scrollHandler}
            headerHeight={headerHeight}
            tabBarHeight={tabBarHeight}
            headerHidden={headerHidden}
            trackRef={trackRef}
            onScrollEnd={onScrollEnd}
          />
        )}
      </Box>

      {/* Search Overlay */}
      <PredictSearchOverlay
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
      />
    </Box>
  );
};

export default PredictFeed;
