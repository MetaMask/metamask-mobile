import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  TextInput,
  Platform,
  LayoutChangeEvent,
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
  useAnimatedStyle,
  useAnimatedScrollHandler,
  SharedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { FlashList, FlashListProps, FlashListRef } from '@shopify/flash-list';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import {
  PredictMarketListSelectorsIDs,
  getPredictMarketListSelector,
} from '../../Predict.testIds';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import { useFeedScrollManager } from '../../hooks/useFeedScrollManager';
import {
  PredictCategory,
  PredictMarket as PredictMarketType,
} from '../../types';
import {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import PredictMarket from '../../components/PredictMarket';
import PredictMarketSkeleton from '../../components/PredictMarketSkeleton';
import { PredictBalance } from '../../components/PredictBalance';
import PredictOffline from '../../components/PredictOffline';
import PredictFeedSessionManager from '../../services/PredictFeedSessionManager';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import Routes from '../../../../../constants/navigation/Routes';
import {
  TabItem,
  TabsBar,
} from '../../../../../component-library/components-temp/Tabs';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';

interface FeedTab {
  key: PredictCategory;
  label: string;
}

type PredictFlashListRef = FlashListRef<PredictMarketType>;
type PredictFlashListProps = FlashListProps<PredictMarketType> & {
  ref?: React.Ref<PredictFlashListRef>;
};

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<PredictFlashListProps>,
) as unknown as React.ComponentType<PredictFlashListProps>;

const PredictFeedHeader: React.FC = () => (
  <Box twClassName="py-4">
    <PredictBalance />
  </Box>
);

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

interface AnimatedHeaderProps {
  headerTranslateY: SharedValue<number>;
  headerHeight: number;
  headerRef: React.RefObject<View>;
  tabBarRef: React.RefObject<View>;
  tabs: FeedTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  onHeaderLayout: (event: LayoutChangeEvent) => void;
  onTabBarLayout: (event: LayoutChangeEvent) => void;
}

const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  headerTranslateY,
  headerHeight,
  headerRef,
  tabBarRef,
  tabs,
  activeIndex,
  onTabPress,
  onHeaderLayout,
  onTabBarLayout,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

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
      <Animated.View
        ref={headerRef}
        style={animatedBalanceStyle}
        onLayout={onHeaderLayout}
      >
        <PredictFeedHeader />
      </Animated.View>
      <View ref={tabBarRef} onLayout={onTabBarLayout}>
        <PredictFeedTabBar
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={onTabPress}
        />
      </View>
    </Animated.View>
  );
};

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

interface PredictTabContentProps {
  category: PredictCategory;
  isActive: boolean;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerHeight: number;
  tabBarHeight: number;
  headerHidden: boolean;
}

const PredictTabContent: React.FC<PredictTabContentProps> = ({
  category,
  isActive,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerHidden,
}) => {
  const tw = useTailwind();
  const listRef = useRef<PredictFlashListRef>(null);

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

  const contentInsetTop = headerHeight + tabBarHeight;
  const currentPaddingTop = headerHidden ? tabBarHeight : contentInsetTop;

  const hasFlashListMounted = useRef(false);
  const getContentOffset = () => {
    if (hasFlashListMounted.current) return undefined;
    hasFlashListMounted.current = true;
    return Platform.select({
      ios: { x: 0, y: headerHidden ? -tabBarHeight : -contentInsetTop },
      android: undefined,
    });
  };

  const renderItem = useCallback(
    (info: { item: PredictMarketType; index: number }) => (
      <PredictMarketListItem
        market={info.item}
        entryPoint={PredictEventValues.ENTRY_POINT.PREDICT_FEED}
        testID={getPredictMarketListSelector.marketCardByCategory(
          category,
          info.index + 1, // E2E tests use 1-based indexing
        )}
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
    [tw, contentInsetTop, headerHidden, tabBarHeight],
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
      testID={`predict-market-list-${category}`}
      data={marketData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={renderFooter}
      scrollEventThrottle={50}
      onScroll={isActive ? (scrollHandler as never) : undefined}
      contentInset={Platform.select({ ios: { top: contentInsetTop } })}
      contentOffset={getContentOffset()}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          progressViewOffset={headerHidden ? tabBarHeight : contentInsetTop}
        />
      }
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      getItemType={() => 'market'}
    />
  );
};

interface PredictFeedTabsProps {
  tabs: FeedTab[];
  activeIndex: number;
  onPageChange: (index: number) => void;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerHeight: number;
  tabBarHeight: number;
  headerHidden: boolean;
}

const PredictFeedTabs: React.FC<PredictFeedTabsProps> = ({
  tabs,
  activeIndex,
  onPageChange,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerHidden,
}) => {
  const tw = useTailwind();
  const pagerRef = useRef<PagerView>(null);

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
      testID="predict-feed-pager"
    >
      {tabs.map((tab, index) => (
        <View
          key={tab.key}
          style={tw.style('flex-1')}
          testID={`predict-feed-tab-page-${tab.key}`}
          collapsable={false}
        >
          <PredictTabContent
            category={tab.key}
            isActive={index === activeIndex}
            scrollHandler={scrollHandler}
            headerHeight={headerHeight}
            tabBarHeight={tabBarHeight}
            headerHidden={headerHidden}
          />
        </View>
      ))}
    </PagerView>
  );
};

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
          ) : !marketData || marketData.length === 0 ? (
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

const PredictFeed: React.FC = () => {
  // This can't be a constant at the top of the file because it would not
  // react to locale changes in the app.
  const tabs: FeedTab[] = useMemo(
    () => [
      { key: 'trending', label: strings('predict.category.trending') },
      { key: 'new', label: strings('predict.category.new') },
      { key: 'sports', label: strings('predict.category.sports') },
      { key: 'crypto', label: strings('predict.category.crypto') },
      { key: 'politics', label: strings('predict.category.politics') },
    ],
    [],
  );

  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketList'>>();

  const headerRef = useRef<View>(null);
  const tabBarRef = useRef<View>(null);

  const [isSearchVisible, setIsSearchVisible] = useState(false);

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

  const sessionManager = PredictFeedSessionManager.getInstance();

  usePredictMeasurement({
    traceName: TraceName.PredictFeedView,
    conditions: [!isSearchVisible],
    debugContext: {
      entryPoint: route.params?.entryPoint,
      isSearchVisible,
    },
  });

  useEffect(() => {
    sessionManager.enableAppStateListener();
    sessionManager.startSession(route.params?.entryPoint, 'trending');

    return () => {
      sessionManager.endSession();
      sessionManager.disableAppStateListener();
    };
  }, [route.params?.entryPoint, sessionManager]);

  useFocusEffect(
    useCallback(() => {
      sessionManager.trackPageView();
    }, [sessionManager]),
  );

  const {
    headerTranslateY,
    headerHidden,
    headerHeight,
    tabBarHeight,
    layoutReady,
    activeIndex,
    setActiveIndex,
    scrollHandler,
    onHeaderLayout,
    onTabBarLayout,
  } = useFeedScrollManager({ headerRef, tabBarRef });

  const handleTabPress = useCallback(
    (index: number) => {
      setActiveIndex(index);
    },
    [setActiveIndex],
  );

  const handlePageChange = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const category = tabs[index]?.key;
      if (category) {
        sessionManager.trackTabChange(category);
      }
    },
    [setActiveIndex, sessionManager, tabs],
  );

  return (
    <Box
      testID={PredictMarketListSelectorsIDs.CONTAINER}
      twClassName="flex-1"
      style={{ backgroundColor: colors.background.default }}
    >
      <Box
        style={tw.style('z-20', {
          backgroundColor: colors.background.default,
          paddingTop: insets.top,
        })}
      >
        <HeaderCenter
          title={strings('wallet.predict')}
          onBack={handleBackPress}
          endButtonIconProps={[
            {
              iconName: IconName.Search,
              onPress: () => setIsSearchVisible(true),
              testID: 'predict-search-button',
            },
          ]}
          testID={PredictMarketListSelectorsIDs.BACK_BUTTON}
        />
      </Box>

      <Box twClassName="flex-1 relative">
        <AnimatedHeader
          headerTranslateY={headerTranslateY}
          headerHeight={headerHeight}
          headerRef={headerRef}
          tabBarRef={tabBarRef}
          tabs={tabs}
          activeIndex={activeIndex}
          onTabPress={handleTabPress}
          onHeaderLayout={onHeaderLayout}
          onTabBarLayout={onTabBarLayout}
        />

        {layoutReady && (
          <PredictFeedTabs
            tabs={tabs}
            activeIndex={activeIndex}
            onPageChange={handlePageChange}
            scrollHandler={scrollHandler}
            headerHeight={headerHeight}
            tabBarHeight={tabBarHeight + 6}
            headerHidden={headerHidden}
          />
        )}
      </Box>

      <PredictSearchOverlay
        isVisible={isSearchVisible}
        onClose={() => setIsSearchVisible(false)}
      />
    </Box>
  );
};

export default PredictFeed;
