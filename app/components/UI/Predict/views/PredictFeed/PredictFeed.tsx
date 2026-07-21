import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useSelector } from 'react-redux';
import {
  View,
  RefreshControl,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  HeaderStandard,
  IconName,
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  PredictMarketListSelectorsIDs,
  PredictSearchSelectorsIDs,
  PredictFeedSelectorsIDs,
  getPredictMarketListSelector,
  getPredictFeedSelector,
} from '../../Predict.testIds';
import { usePredictMarketData } from '../../hooks/usePredictMarketData';
import { deduplicateSeriesMarkets } from '../../utils/feed';
import { useFeedScrollManager } from '../../hooks/useFeedScrollManager';
import { usePredictTabs, type FeedTab } from '../../hooks/usePredictTabs';
import { usePredictSearch } from '../../hooks/usePredictSearch';
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
import PredictSearchOverlay from '../../components/PredictSearchOverlay';
import { PredictBalance } from '../../components/PredictBalance';
import PredictWithdrawUnavailableSheet, {
  type PredictWithdrawUnavailableSheetRef,
} from '../../components/PredictWithdrawUnavailableSheet';
import PredictOffline from '../../components/PredictOffline';
import FeaturedCarousel from '../../components/FeaturedCarousel';
import {
  selectPredictFeaturedCarouselEnabledFlag,
  selectPredictPortfolioEnabledFlag,
  selectPredictUpDownEnabledFlag,
} from '../../selectors/featureFlags';
import PredictFeedSessionManager from '../../services/PredictFeedSessionManager';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { TraceName } from '../../../../../util/trace';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  TabItem,
  TabsBar,
} from '../../../../../component-library/components-temp/Tabs';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

type PredictFlashListRef = FlashListRef<PredictMarketType>;
type PredictFlashListProps = FlashListProps<PredictMarketType> & {
  ref?: React.Ref<PredictFlashListRef>;
};

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as React.ComponentType<PredictFlashListProps>,
) as unknown as React.ComponentType<PredictFlashListProps>;

const PredictFeedHeader: React.FC<{
  onDepositWalletWithdrawPress?: () => void;
  topInset?: number;
  hideTitle?: boolean;
}> = ({ onDepositWalletWithdrawPress, topInset = 0, hideTitle = false }) => (
  <Box
    twClassName="pb-4"
    style={topInset > 0 ? { paddingTop: topInset } : undefined}
  >
    <PredictBalance
      onDepositWalletWithdrawPress={onDepositWalletWithdrawPress}
      hideTitle={hideTitle}
    />
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
      testID={PredictFeedSelectorsIDs.TABS}
    />
  );
};

interface AnimatedHeaderProps {
  headerTranslateY: SharedValue<number>;
  headerHeight: number;
  headerRef: React.RefObject<View | null>;
  tabBarRef: React.RefObject<View | null>;
  tabs: FeedTab[];
  activeIndex: number;
  onTabPress: (index: number) => void;
  onHeaderLayout: (event: LayoutChangeEvent) => void;
  onTabBarLayout: (event: LayoutChangeEvent) => void;
  onDepositWalletWithdrawPress?: () => void;
  topInset?: number;
  hideTitle?: boolean;
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
  onDepositWalletWithdrawPress,
  topInset = 0,
  hideTitle = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const isFeaturedCarouselEnabled = useSelector(
    selectPredictFeaturedCarouselEnabledFlag,
  );

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
        testID={PredictFeedSelectorsIDs.HEADER}
        ref={headerRef}
        style={animatedBalanceStyle}
        onLayout={onHeaderLayout}
      >
        <PredictFeedHeader
          onDepositWalletWithdrawPress={onDepositWalletWithdrawPress}
          topInset={topInset}
          hideTitle={hideTitle}
        />
        {isFeaturedCarouselEnabled && (
          <Box twClassName="pb-3">
            <FeaturedCarousel />
          </Box>
        )}
      </Animated.View>
      <View
        ref={tabBarRef}
        onLayout={onTabBarLayout}
        testID={PredictFeedSelectorsIDs.TAB_BAR_CONTAINER}
      >
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
  predictFeedTab?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PredictMarketListItem: React.FC<PredictMarketListItemProps> = React.memo(
  ({
    market,
    entryPoint,
    testID,
    predictFeedTab,
    transactionActiveAbTests,
  }) => (
    <PredictMarket
      market={market}
      entryPoint={entryPoint}
      testID={testID}
      predictFeedTab={predictFeedTab}
      transactionActiveAbTests={transactionActiveAbTests}
    />
  ),
);

interface PredictTabContentProps {
  category: PredictCategory;
  isActive: boolean;
  listEntryPoint: PredictEntryPoint;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerHeight: number;
  tabBarHeight: number;
  headerHidden: boolean;
  customQueryParams?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PredictTabContent: React.FC<PredictTabContentProps> = ({
  category,
  isActive,
  listEntryPoint,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerHidden,
  customQueryParams,
  transactionActiveAbTests,
}) => {
  const tw = useTailwind();
  const listRef = useRef<PredictFlashListRef>(null);

  const [hasEverBeenActive, setHasEverBeenActive] = useState(isActive);
  useEffect(() => {
    if (isActive) {
      setHasEverBeenActive(true);
    }
  }, [isActive]);

  const upDownEnabled = useSelector(selectPredictUpDownEnabledFlag);
  const refine = upDownEnabled ? deduplicateSeriesMarkets : undefined;

  // Skip getMarkets for tabs that have never been visible. PagerView mounts
  // every PredictTabContent at once, so without this gate each tab fetches on
  // mount. The `isActive` term covers the first render a tab activates, before
  // the effect above flips `hasEverBeenActive`; `hasEverBeenActive` then keeps
  // already-visited tabs warm when swiping back.
  const fetchEnabled = isActive || hasEverBeenActive;

  const {
    marketData,
    isFetching,
    error,
    hasMore,
    refetch,
    fetchMore,
    isFetchingMore,
  } = usePredictMarketData({
    category,
    pageSize: 20,
    customQueryParams,
    refine,
    enabled: fetchEnabled,
  });

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
        entryPoint={listEntryPoint}
        testID={getPredictMarketListSelector.marketCardByCategory(
          category,
          info.index + 1, // E2E tests use 1-based indexing
        )}
        predictFeedTab={category}
        transactionActiveAbTests={transactionActiveAbTests}
      />
    ),
    [category, listEntryPoint, transactionActiveAbTests],
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
        <PredictMarketSkeleton
          testID={getPredictFeedSelector.skeletonFooter(category, 1)}
        />
        <PredictMarketSkeleton
          testID={getPredictFeedSelector.skeletonFooter(category, 2)}
        />
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
        <PredictMarketSkeleton
          testID={getPredictFeedSelector.skeletonLoading(category, 1)}
        />
        <PredictMarketSkeleton
          testID={getPredictFeedSelector.skeletonLoading(category, 2)}
        />
        <PredictMarketSkeleton
          testID={getPredictFeedSelector.skeletonLoading(category, 3)}
        />
        <PredictMarketSkeleton
          testID={getPredictFeedSelector.skeletonLoading(category, 4)}
        />
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
        testID={getPredictFeedSelector.emptyState(category)}
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
      testID={getPredictFeedSelector.marketList(category)}
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
  listEntryPoint: PredictEntryPoint;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerHeight: number;
  tabBarHeight: number;
  headerHidden: boolean;
  initialPage: number;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PredictFeedTabs: React.FC<PredictFeedTabsProps> = ({
  tabs,
  activeIndex,
  onPageChange,
  listEntryPoint,
  scrollHandler,
  headerHeight,
  tabBarHeight,
  headerHidden,
  initialPage,
  transactionActiveAbTests,
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
      initialPage={initialPage}
      onPageSelected={handlePageSelected}
      testID={PredictFeedSelectorsIDs.PAGER}
    >
      {tabs.map((tab, index) => (
        <View
          key={tab.key}
          style={tw.style('flex-1')}
          testID={getPredictFeedSelector.tabPage(tab.key)}
          collapsable={false}
        >
          <PredictTabContent
            category={tab.key}
            isActive={index === activeIndex}
            listEntryPoint={listEntryPoint}
            scrollHandler={scrollHandler}
            headerHeight={headerHeight}
            tabBarHeight={tabBarHeight}
            headerHidden={headerHidden}
            customQueryParams={tab.customQueryParams}
            transactionActiveAbTests={transactionActiveAbTests}
          />
        </View>
      ))}
    </PagerView>
  );
};

interface PredictFeedProps {
  hideHeader?: boolean;
  /**
   * Top padding before the title/balance header when embedded in
   * HomepageDiscoveryTabs — keeps the predict background flush under the
   * discovery tab bar and adds spacing before the screen title (32px).
   */
  topInset?: number;
  entryPoint?: PredictEntryPoint;
  onHeaderHiddenChange?: (hidden: boolean) => void;
  walletHeaderTranslateY?: SharedValue<number>;
  walletHeaderHeight?: number;
}

const PredictFeed: React.FC<PredictFeedProps> = ({
  hideHeader = false,
  topInset = 0,
  entryPoint: propEntryPoint,
  onHeaderHiddenChange,
  walletHeaderTranslateY,
  walletHeaderHeight,
}) => {
  const { tabs, activeIndex, setActiveIndex, initialTabKey } = usePredictTabs();

  const tw = useTailwind();
  const { colors } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketList'>>();
  const transactionActiveAbTests = route.params?.transactionActiveAbTests;
  const feedEntryPoint = propEntryPoint ?? route.params?.entryPoint;
  const listEntryPoint =
    feedEntryPoint ?? PredictEventValues.ENTRY_POINT.PREDICT_FEED;
  const predictPortfolioEnabled = useSelector(
    selectPredictPortfolioEnabledFlag,
  );

  const headerRef = useRef<View>(null);
  const tabBarRef = useRef<View>(null);

  const {
    isSearchVisible,
    searchQuery,
    setSearchQuery,
    showSearch,
    clearSearchAndClose,
  } = usePredictSearch();

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET_VIEW,
      });
    }
  }, [navigation]);

  const sessionManager = PredictFeedSessionManager.getInstance();

  usePredictMeasurement({
    traceName: TraceName.PredictFeedView,
    conditions: [!isSearchVisible],
    debugContext: {
      entryPoint: feedEntryPoint,
      isSearchVisible,
    },
  });

  useEffect(() => {
    sessionManager.setPortfolioModuleEnabled(predictPortfolioEnabled);
  }, [predictPortfolioEnabled, sessionManager]);

  useEffect(() => {
    sessionManager.enableAppStateListener();
    sessionManager.startSession(feedEntryPoint, initialTabKey);

    return () => {
      sessionManager.endSession();
      sessionManager.disableAppStateListener();
    };
  }, [feedEntryPoint, sessionManager, initialTabKey]);

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
    onTabSwitch,
    scrollHandler,
    onHeaderLayout,
    onTabBarLayout,
  } = useFeedScrollManager({
    headerRef,
    tabBarRef,
    setActiveIndex,
    onHeaderHiddenChange,
    walletHeaderTranslateY,
    walletHeaderHeight,
  });

  const handleTabPress = useCallback(
    (index: number) => {
      onTabSwitch(index);
    },
    [onTabSwitch],
  );

  const handlePageChange = useCallback(
    (index: number) => {
      onTabSwitch(index);
      const category = tabs[index]?.key;
      if (category) {
        sessionManager.trackTabChange(category);
      }
    },
    [onTabSwitch, sessionManager, tabs],
  );

  const withdrawUnavailableSheetRef =
    useRef<PredictWithdrawUnavailableSheetRef>(null);
  const handleDepositWalletWithdrawPress = useCallback(() => {
    withdrawUnavailableSheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleShowSearch = useCallback(() => {
    Engine.context.PredictController.trackSearchInteracted({
      interactionType: PredictEventValues.SEARCH_INTERACTION.OPENED,
      predictFeedTab: tabs[activeIndex]?.key,
      entryPoint: listEntryPoint,
    });
    showSearch();
  }, [tabs, activeIndex, listEntryPoint, showSearch]);

  const headerTopInset = hideHeader ? topInset : 0;

  return (
    <SafeAreaView
      edges={hideHeader ? [] : { bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        testID={PredictMarketListSelectorsIDs.CONTAINER}
        twClassName="flex-1"
        style={{ backgroundColor: colors.background.default }}
      >
        {!hideHeader && (
          <Box
            style={tw.style('z-20', {
              backgroundColor: colors.background.default,
            })}
          >
            <HeaderStandard
              includesTopInset
              onBack={handleBackPress}
              backButtonProps={{
                testID: PredictMarketListSelectorsIDs.BACK_BUTTON,
              }}
              endButtonIconProps={[
                {
                  iconName: IconName.Search,
                  onPress: handleShowSearch,
                  testID: PredictSearchSelectorsIDs.SEARCH_BUTTON,
                },
              ]}
            />
          </Box>
        )}

        <Box twClassName="flex-1 relative overflow-hidden">
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
            onDepositWalletWithdrawPress={handleDepositWalletWithdrawPress}
            topInset={headerTopInset}
            hideTitle={hideHeader}
          />

          {layoutReady && (
            <PredictFeedTabs
              tabs={tabs}
              activeIndex={activeIndex}
              onPageChange={handlePageChange}
              listEntryPoint={listEntryPoint}
              scrollHandler={scrollHandler}
              headerHeight={headerHeight}
              tabBarHeight={tabBarHeight + 6}
              headerHidden={headerHidden}
              initialPage={activeIndex}
              transactionActiveAbTests={transactionActiveAbTests}
            />
          )}
        </Box>

        <PredictSearchOverlay
          isVisible={isSearchVisible}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={clearSearchAndClose}
          transactionActiveAbTests={transactionActiveAbTests}
          predictFeedTab={tabs[activeIndex]?.key}
          entryPoint={listEntryPoint}
        />
      </Box>
      <Box pointerEvents="box-none" twClassName="absolute inset-0 z-50">
        <PredictWithdrawUnavailableSheet ref={withdrawUnavailableSheetRef} />
      </Box>
    </SafeAreaView>
  );
};

export default PredictFeed;
