import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  forwardRef,
} from 'react';
import { View, Pressable, RefreshControl, TextInput } from 'react-native';
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

interface UseFeedHeaderAnimationParams {
  headerRef: React.RefObject<View>;
  tabBarRef: React.RefObject<View>;
}

interface UseFeedHeaderAnimationReturn {
  /** Animation progress: 0 = visible (expanded), headerHeight = hidden (collapsed) */
  animationProgress: SharedValue<number>;
  /** Measured header height in pixels */
  headerHeight: number;
  /** Measured tab bar height in pixels */
  tabBarHeight: number;
  /** Scroll handler to attach to FlashList */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** Reset scroll tracking (call on tab switch) */
  resetScrollTracking: () => void;
  /** Whether layout measurements are ready */
  layoutReady: boolean;
}

/**
 * Manages header show/hide animation driven directly by scroll position.
 *
 * Returns a single animationProgress value (0 to headerHeight) that components
 * can use to derive their own animated styles:
 * - 0 = header fully visible (expanded state)
 * - headerHeight = header fully hidden (collapsed state)
 *
 * The animation follows scroll position directly (no timing animation).
 */
const useFeedHeaderAnimation = ({
  headerRef,
  tabBarRef,
}: UseFeedHeaderAnimationParams): UseFeedHeaderAnimationReturn => {
  // Animation progress: 0 = visible, headerHeight = hidden
  // This value moves directly with scroll, capped at [0, headerHeight]
  const animationProgress = useSharedValue(0);

  // Shared value for headerHeight (needed in worklet)
  const sharedHeaderHeight = useSharedValue(0);

  // Layout measurements (JS side)
  const [headerHeight, setHeaderHeight] = useState(0);
  const [tabBarHeight, setTabBarHeight] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);

  // Measure heights using useLayoutEffect (React Native new architecture)
  useLayoutEffect(() => {
    let headerMeasured = false;
    let tabBarMeasured = false;

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
            tabBarMeasured = true;
            checkLayoutReady();
          }
        });
      }
    };

    // Small delay to ensure components are mounted and rendered
    const timeoutId = setTimeout(measureHeights, 50);
    return () => clearTimeout(timeoutId);
  }, [headerRef, tabBarRef, layoutReady, sharedHeaderHeight]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const scrollY = event.contentOffset.y;
      const maxScroll = sharedHeaderHeight.value;

      // Clamp scroll position between 0 and headerHeight
      // This makes the header follow the scroll directly
      animationProgress.value = Math.min(Math.max(scrollY, 0), maxScroll);
    },
  });

  // Reset animation (called on tab switch) - keep current state
  const resetScrollTracking = useCallback(() => {
    // Intentionally empty - keep animation state when switching tabs
  }, []);

  return {
    animationProgress,
    headerHeight,
    tabBarHeight,
    scrollHandler,
    resetScrollTracking,
    layoutReady,
  };
};

// =============================================================================
// COMPONENTS - Top Navigation (Static)
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

// =============================================================================
// COMPONENTS - Header (Animated)
// =============================================================================

interface PredictFeedHeaderProps {
  animationProgress: SharedValue<number>;
}

const PredictFeedHeader = forwardRef<View, PredictFeedHeaderProps>(
  ({ animationProgress }, ref) => {
    const tw = useTailwind();
    const { colors } = useTheme();

    // Header translateY: 0 when visible, -headerHeight when hidden
    // animationProgress is already in pixels (0 to headerHeight)
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: -animationProgress.value }],
    }));

    return (
      <Animated.View
        ref={ref}
        style={[
          tw.style('absolute top-0 left-0 right-0 py-8 z-10'),
          { backgroundColor: colors.background.default },
          animatedStyle,
        ]}
      >
        <PredictBalance />
      </Animated.View>
    );
  },
);

PredictFeedHeader.displayName = 'PredictFeedHeader';

// =============================================================================
// COMPONENTS - Tab Bar (Animated)
// =============================================================================

interface PredictFeedTabBarProps {
  animationProgress: SharedValue<number>;
  headerHeight: number;
  tabs: FeedTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

const PredictFeedTabBar = forwardRef<View, PredictFeedTabBarProps>(
  ({ animationProgress, headerHeight, tabs, activeIndex, onTabPress }, ref) => {
    const tw = useTailwind();
    const { colors } = useTheme();

    // TabBar starts at headerHeight, moves up as header hides
    // When visible (progress=0): top = headerHeight
    // When hidden (progress=headerHeight): top = 0 (pinned at top)
    // animationProgress is already in pixels (0 to headerHeight)
    const animatedStyle = useAnimatedStyle(() => ({
      top: headerHeight - animationProgress.value,
    }));

    // Convert FeedTab[] to TabItem[] for TabsBar
    const tabItems: TabItem[] = useMemo(
      () =>
        tabs.map((tab) => ({
          key: tab.key,
          label: tab.label,
          content: null, // Not used since we manage content separately
        })),
      [tabs],
    );

    return (
      <Animated.View
        ref={ref}
        style={[
          tw.style('absolute left-0 right-0 z-10'),
          { backgroundColor: colors.background.default },
          animatedStyle,
        ]}
      >
        <TabsBar
          tabs={tabItems}
          activeIndex={activeIndex}
          onTabPress={onTabPress}
          testID="predict-feed-tabs"
        />
      </Animated.View>
    );
  },
);

PredictFeedTabBar.displayName = 'PredictFeedTabBar';

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
  category: PredictCategory;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  contentPaddingTop: number;
  isActive: boolean;
}

const PredictTabContent: React.FC<PredictTabContentProps> = ({
  category,
  scrollHandler,
  contentPaddingTop,
  isActive,
}) => {
  const tw = useTailwind();
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

  const contentContainerStyle = useMemo(
    () => tw.style('pb-4 px-4', { paddingTop: contentPaddingTop }),
    [tw, contentPaddingTop],
  );

  if (isFetching && !isRefreshing) {
    return (
      <Box twClassName="flex-1 px-4" style={{ paddingTop: contentPaddingTop }}>
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-1`} />
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-2`} />
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-3`} />
        <PredictMarketSkeleton testID={`skeleton-loading-${category}-4`} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box style={{ paddingTop: contentPaddingTop }}>
        <PredictOffline onRetry={handleRefresh} />
      </Box>
    );
  }

  if (!marketData || marketData.length === 0) {
    return (
      <Box
        testID={`predict-empty-state-${category}`}
        twClassName="flex-1 justify-center items-center p-8"
        style={{ paddingTop: contentPaddingTop }}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.PrimaryAlternative}>
          {strings('predict.search_empty_state', { category })}
        </Text>
      </Box>
    );
  }

  return (
    <AnimatedFlashList
      data={marketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={renderFooter}
      onScroll={isActive ? (scrollHandler as never) : undefined}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          progressViewOffset={contentPaddingTop}
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
  contentPaddingTop: number;
}

const PredictFeedTabs: React.FC<PredictFeedTabsProps> = ({
  activeIndex,
  scrollHandler,
  contentPaddingTop,
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
              category={tab.key}
              scrollHandler={scrollHandler}
              contentPaddingTop={contentPaddingTop}
              isActive={isActive}
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

  // Tab state
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Animation hook - handles measurements and scroll-driven animation
  const {
    animationProgress,
    headerHeight,
    tabBarHeight,
    scrollHandler,
    resetScrollTracking,
    layoutReady,
  } = useFeedHeaderAnimation({ headerRef, tabBarRef });

  // Handle tab change
  const handleTabPress = useCallback(
    (index: number) => {
      setActiveTabIndex(index);
      resetScrollTracking();
    },
    [resetScrollTracking],
  );

  // Content padding = header + tabbar
  const contentPaddingTop = headerHeight + tabBarHeight;

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
        {/* Header - Animated (absolute positioned) */}
        <PredictFeedHeader
          ref={headerRef}
          animationProgress={animationProgress}
        />

        {/* Tab Bar - Animated (absolute positioned) */}
        <PredictFeedTabBar
          ref={tabBarRef}
          animationProgress={animationProgress}
          headerHeight={headerHeight}
          tabs={TABS}
          activeIndex={activeTabIndex}
          onTabPress={handleTabPress}
        />

        {/* Tab Content - Takes remaining space */}
        {layoutReady && (
          <PredictFeedTabs
            activeIndex={activeTabIndex}
            scrollHandler={scrollHandler}
            contentPaddingTop={contentPaddingTop}
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
