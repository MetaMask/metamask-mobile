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
  InteractionManager,
} from 'react-native';
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
} from 'react-native-reanimated';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import {
  PredictCategory,
  PredictMarket as PredictMarketType,
} from '../../types';
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
type PredictFlashListProps = FlashListProps<PredictMarketType>;
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
  /** Header translateY: 0 = visible, -headerHeight = hidden */
  headerTranslateY: SharedValue<number>;
  /** Measured header height in pixels */
  headerHeight: number;
  /** Measured tab bar height in pixels */
  tabBarHeight: number;
  /** Whether layout measurements are ready */
  layoutReady: boolean;
  /** Current active tab index */
  activeIndex: number;
  /** Set active tab index */
  setActiveIndex: (index: number) => void;
  /** Scroll handler to attach to active FlashList */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** Track a tab's FlashList ref */
  trackRef: (tabKey: string, ref: FlashList<PredictMarketType> | null) => void;
  /** Get the current header offset (0 to headerHeight) */
  getCurrentHeaderOffset: () => number;
  /** Called when scroll ends - syncs inactive tabs if needed */
  onScrollEnd: () => void;
  /** Update a tab's scroll position in tracking map */
  updateTabScrollPosition: (tabKey: string, position: number) => void;
  /** Get a tab's tracked scroll position */
  getTabScrollPosition: (tabKey: string) => number;
}

/**
 * Manages scroll-driven header animation with direction-based show/hide.
 *
 * Key behaviors:
 * - Header follows scroll delta (not absolute position)
 * - Scrolling down hides header, scrolling up reveals it (anywhere in list)
 * - At top of list, header is always fully visible
 * - Each tab maintains its own scroll position
 * - Inactive tabs are synced when switching to prevent visual gaps
 */
const useFeedScrollManager = ({
  tabs,
  headerRef,
  tabBarRef,
}: UseFeedScrollManagerParams): UseFeedScrollManagerReturn => {
  // Header translateY: 0 = visible, -headerHeight = hidden
  const headerTranslateY = useSharedValue(0);

  // Shared values for worklet access
  const sharedHeaderHeight = useSharedValue(0);
  const sharedTabBarHeight = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  // Flag to skip delta calculation on first scroll after tab switch
  const isTabSwitching = useSharedValue(false);

  // Layout measurements (JS side)
  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);

  // Tab state
  const [activeIndex, setActiveIndex] = useState(0);

  // Track refs and scroll positions for each tab
  const tabKeyToRef = useRef<Record<string, FlashList<PredictMarketType>>>({});
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
  }, [headerRef, tabBarRef, layoutReady, sharedHeaderHeight, sharedTabBarHeight]);

  // Track ref for a tab
  const trackRef = useCallback(
    (tabKey: string, ref: FlashList<PredictMarketType> | null) => {
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
  const getTabScrollPosition = useCallback((tabKey: string) => {
    return tabKeyToScrollPosition.current[tabKey] ?? 0;
  }, []);

  // Get current header offset (0 = visible, headerHeight = hidden)
  const getCurrentHeaderOffset = useCallback(() => {
    return -headerTranslateY.value;
  }, [headerTranslateY]);

  // Sync inactive tabs when scroll ends
  const onScrollEnd = useCallback(() => {
    const activeKey = tabs[activeIndex].key;
    const currentHeaderOffset = -headerTranslateY.value; // 0 to headerHeight

    Object.entries(tabKeyToRef.current).forEach(([key, ref]) => {
      if (key === activeKey || !ref) return;

      const tabPosition = tabKeyToScrollPosition.current[key] ?? 0;

      // If header is hidden but this tab hasn't scrolled past header threshold,
      // adjust its position so there's no gap when switching to it
      if (currentHeaderOffset > 0 && tabPosition < currentHeaderOffset) {
        ref.scrollToOffset({ offset: currentHeaderOffset, animated: false });
        tabKeyToScrollPosition.current[key] = currentHeaderOffset;
      }
    });
  }, [tabs, activeIndex, headerTranslateY]);

  // Direction-based scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const currentY = event.contentOffset.y;

      // After tab switch, just initialize lastScrollY without affecting header
      if (isTabSwitching.value) {
        isTabSwitching.value = false;
        lastScrollY.value = currentY;
        return;
      }

      const delta = currentY - lastScrollY.value;
      lastScrollY.value = currentY;

      // Calculate the "at top" threshold
      // On iOS with contentInset, contentOffset.y is negative when near top
      // The actual "top" is when contentOffset.y <= -contentInsetTop
      const contentInsetTop =
        sharedHeaderHeight.value + sharedTabBarHeight.value;
      const atTopThreshold = -contentInsetTop;

      // At/near top of list - always show header fully
      if (currentY <= atTopThreshold) {
        headerTranslateY.value = 0;
        return;
      }

      // Apply delta to header position
      // Scroll down (delta > 0) → header moves up (more negative)
      // Scroll up (delta < 0) → header moves down (less negative)
      const newValue = headerTranslateY.value - delta;

      // Clamp: 0 (fully visible) to -headerHeight (fully hidden)
      headerTranslateY.value = Math.max(
        -sharedHeaderHeight.value,
        Math.min(0, newValue),
      );
    },
  });

  // Handle tab change with sync
  const handleSetActiveIndex = useCallback(
    (index: number) => {
      // Set flag to skip delta calculation on first scroll of new tab
      isTabSwitching.value = true;

      const newTabKey = tabs[index].key;
      const currentHeaderOffset = -headerTranslateY.value;
      const newTabScrollPos = tabKeyToScrollPosition.current[newTabKey] ?? 0;

      // If switching to a tab that would show a gap, adjust it first
      if (currentHeaderOffset > 0 && newTabScrollPos < currentHeaderOffset) {
        const ref = tabKeyToRef.current[newTabKey];
        if (ref) {
          ref.scrollToOffset({ offset: currentHeaderOffset, animated: false });
          tabKeyToScrollPosition.current[newTabKey] = currentHeaderOffset;
        }
      }

      setActiveIndex(index);
    },
    [tabs, headerTranslateY, isTabSwitching],
  );

  return {
    headerTranslateY,
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
// ANIMATED HEADER (handles scroll-driven positioning)
// =============================================================================

interface AnimatedHeaderProps {
  headerTranslateY: SharedValue<number>;
  headerRef: React.RefObject<View>;
  tabBarRef: React.RefObject<View>;
  tabs: FeedTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

/**
 * Animated header containing both balance and tab bar.
 * The balance section scrolls away while tab bar pins to top.
 *
 * Animation: Container translates from 0 to -headerHeight (balance height).
 * When fully translated, balance is hidden above viewport, tab bar is at y=0.
 */
const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  headerTranslateY,
  headerRef,
  tabBarRef,
  tabs,
  activeIndex,
  onTabPress,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[
        tw.style('absolute top-0 left-0 right-0 z-10'),
        { backgroundColor: colors.background.default },
        animatedStyle,
      ]}
    >
      <View ref={headerRef}>
        <PredictFeedHeader />
      </View>
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
// COMPONENTS - Market List Item
// =============================================================================

interface PredictMarketListItemProps {
  market: PredictMarketType;
  entryPoint: string;
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
  headerTranslateY: SharedValue<number>;
  trackRef: (tabKey: string, ref: FlashList<PredictMarketType> | null) => void;
  onScrollEnd: () => void;
  updateTabScrollPosition: (tabKey: string, position: number) => void;
  getTabScrollPosition: (tabKey: string) => number;
  getCurrentHeaderOffset: () => number;
}

const PredictTabContent: React.FC<PredictTabContentProps> = ({
  tabKey,
  category,
  isActive,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerTranslateY,
  trackRef,
  onScrollEnd,
  updateTabScrollPosition,
  getTabScrollPosition,
  getCurrentHeaderOffset,
}) => {
  const tw = useTailwind();
  const listRef = useRef<FlashList<PredictMarketType>>(null);

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

  // Total inset for content (space for header + tabbar)
  const contentInsetTop = headerHeight + tabBarHeight;

  // Current padding for non-scrollable content (loading/error/empty states)
  // Accounts for header visibility: full inset when visible, just tabbar when hidden
  const currentPaddingTop = contentInsetTop - getCurrentHeaderOffset();

  // Track if we've already set initial scroll position for FlashList
  const hasSetInitialOffset = useRef(false);

  // Calculate initial content offset based on current header state
  // iOS: contentOffset.y is relative to contentInset
  // Android: contentOffset.y is the absolute scroll position
  const getInitialContentOffset = useCallback(() => {
    // Only provide initial offset once (when FlashList first mounts)
    if (hasSetInitialOffset.current) return undefined;
    hasSetInitialOffset.current = true;

    const currentHeaderOffset = getCurrentHeaderOffset();

    // iOS: offset is relative to contentInset
    // When header visible: -contentInsetTop (content at top)
    // When header hidden: -(tabBarHeight) (content right under pinned tabbar)
    const iosOffset = -(contentInsetTop - currentHeaderOffset);

    // Android: offset is absolute scroll position
    // When header visible: 0 (no scroll)
    // When header hidden: headerHeight (scroll to hide the gap)
    const androidOffset = currentHeaderOffset;

    return Platform.select({
      ios: { x: 0, y: iosOffset },
      android: { x: 0, y: androidOffset },
    });
  }, [contentInsetTop, getCurrentHeaderOffset]);

  // Track scroll position changes
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      // Adjust for iOS contentInset
      const adjustedY =
        Platform.OS === 'ios'
          ? event.nativeEvent.contentOffset.y + contentInsetTop
          : event.nativeEvent.contentOffset.y;
      updateTabScrollPosition(tabKey, adjustedY);
    },
    [tabKey, updateTabScrollPosition, contentInsetTop],
  );

  // Track if we've done initial scroll adjustment (backup for contentOffset)
  const hasAdjustedScroll = useRef(false);

  // On Android, backup scroll adjustment via onLayout if contentOffset didn't work
  const handleListLayout = useCallback(() => {
    if (
      Platform.OS === 'android' &&
      !hasAdjustedScroll.current &&
      listRef.current
    ) {
      hasAdjustedScroll.current = true;
      const currentHeaderOffset = getCurrentHeaderOffset();
      if (currentHeaderOffset > 0) {
        // Use InteractionManager to ensure scroll happens after layout is complete
        InteractionManager.runAfterInteractions(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({
              offset: currentHeaderOffset,
              animated: false,
            });
          }
        });
      }
    }
  }, [getCurrentHeaderOffset]);

  // On Android, adjust scroll when tab becomes active (component stays mounted)
  // This handles the case where header state changed while tab was inactive
  const prevIsActive = useRef(isActive);
  useEffect(() => {
    // Only trigger when becoming active (not on initial mount handled above)
    if (
      Platform.OS === 'android' &&
      isActive &&
      !prevIsActive.current &&
      listRef.current &&
      marketData &&
      marketData.length > 0
    ) {
      const currentHeaderOffset = getCurrentHeaderOffset();
      const currentScrollPos = getTabScrollPosition(tabKey);

      // If header is hidden but tab hasn't scrolled past header area, adjust
      if (currentHeaderOffset > 0 && currentScrollPos < currentHeaderOffset) {
        listRef.current.scrollToOffset({
          offset: currentHeaderOffset,
          animated: false,
        });
      }
    }
    prevIsActive.current = isActive;
  }, [isActive, getCurrentHeaderOffset, getTabScrollPosition, marketData, tabKey]);


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
          android: { flexGrow: 1, paddingTop: contentInsetTop },
        }),
      ),
    [tw, contentInsetTop],
  );

  if (isFetching && !isRefreshing && !isFetchingMore) {
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
      ref={listRef as never}
      data={marketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={renderFooter}
      onScroll={isActive ? (scrollHandler as never) : undefined}
      onScrollEndDrag={onScrollEnd}
      onMomentumScrollEnd={onScrollEnd}
      onLayout={handleListLayout}
      scrollEventThrottle={16}
      // iOS-specific: use contentInset for proper pull-to-refresh
      contentInset={Platform.select({ ios: { top: contentInsetTop } })}
      contentOffset={getInitialContentOffset()}
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
      estimatedItemSize={150}
    />
  );
};

// =============================================================================
// COMPONENTS - Tabs Container (Lazy Loading)
// =============================================================================

interface PredictFeedTabsProps {
  activeIndex: number;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerHeight: number;
  tabBarHeight: number;
  headerTranslateY: SharedValue<number>;
  trackRef: (tabKey: string, ref: FlashList<PredictMarketType> | null) => void;
  onScrollEnd: () => void;
  updateTabScrollPosition: (tabKey: string, position: number) => void;
  getTabScrollPosition: (tabKey: string) => number;
  getCurrentHeaderOffset: () => number;
}

const PredictFeedTabs: React.FC<PredictFeedTabsProps> = ({
  activeIndex,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerTranslateY,
  trackRef,
  onScrollEnd,
  updateTabScrollPosition,
  getTabScrollPosition,
  getCurrentHeaderOffset,
}) => {
  const tw = useTailwind();

  // Track which tabs have been visited (for lazy loading)
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(
    new Set([0]), // Start with first tab loaded
  );

  // Mark tab as visited when it becomes active
  useEffect(() => {
    if (!visitedTabs.has(activeIndex)) {
      setVisitedTabs((prev) => new Set(prev).add(activeIndex));
    }
  }, [activeIndex, visitedTabs]);

  return (
    <Box twClassName="flex-1">
      {TABS.map((tab, index) => {
        const isActive = index === activeIndex;
        const hasBeenVisited = visitedTabs.has(index);

        // Don't render until first visit (lazy loading)
        if (!hasBeenVisited) {
          return null;
        }

        return (
          <Box
            key={tab.key}
            style={tw.style(
              'absolute inset-0',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
            pointerEvents={isActive ? 'auto' : 'none'}
          >
            <PredictTabContent
              tabKey={tab.key}
              category={tab.key}
              isActive={isActive}
              scrollHandler={scrollHandler}
              headerHeight={headerHeight}
              tabBarHeight={tabBarHeight}
              headerTranslateY={headerTranslateY}
              trackRef={trackRef}
              onScrollEnd={onScrollEnd}
              updateTabScrollPosition={updateTabScrollPosition}
              getTabScrollPosition={getTabScrollPosition}
              getCurrentHeaderOffset={getCurrentHeaderOffset}
            />
          </Box>
        );
      })}
    </Box>
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
            color={colors.text.muted}
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
                color={colors.text.muted}
              />
            </Pressable>
          )}
        </Box>
        <Pressable onPress={handleCancel}>
          <Text variant={TextVariant.BodyMD} style={tw.style('font-medium')}>
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
            <FlashList
              data={marketData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              contentContainerStyle={tw.style('px-4 pt-4 pb-4')}
              showsVerticalScrollIndicator={false}
              estimatedItemSize={150}
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

  // Scroll manager - handles all scroll/animation logic
  const {
    headerTranslateY,
    headerHeight,
    tabBarHeight,
    layoutReady,
    activeIndex,
    setActiveIndex,
    scrollHandler,
    trackRef,
    getCurrentHeaderOffset,
    onScrollEnd,
    updateTabScrollPosition,
    getTabScrollPosition,
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
          headerRef={headerRef}
          tabBarRef={tabBarRef}
          tabs={TABS}
          activeIndex={activeIndex}
          onTabPress={setActiveIndex}
        />

        {/* Tab Content - Takes remaining space, only render when layout is ready */}
        {layoutReady && (
          <PredictFeedTabs
            activeIndex={activeIndex}
            scrollHandler={scrollHandler}
            headerHeight={headerHeight}
            tabBarHeight={tabBarHeight}
            headerTranslateY={headerTranslateY}
            trackRef={trackRef}
            onScrollEnd={onScrollEnd}
            updateTabScrollPosition={updateTabScrollPosition}
            getTabScrollPosition={getTabScrollPosition}
            getCurrentHeaderOffset={getCurrentHeaderOffset}
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
