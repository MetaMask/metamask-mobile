import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  type AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSelector } from 'react-redux';
import type { TrendingAsset } from '@metamask/assets-controllers';
import TrendingQuickBuy from '../../../../UI/Trending/components/TrendingQuickBuy/TrendingQuickBuy';
import { useABTest } from '../../../../../hooks/useABTest';
import {
  EXPLORE_QUICK_BUY_AB_KEY,
  EXPLORE_QUICK_BUY_VARIANTS,
  EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
} from '../../search/abTestConfig';
import { useQuickBuySearchKeyboard } from '../../../../UI/Trending/hooks/useQuickBuySearchKeyboard/useQuickBuySearchKeyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { FlashList, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import ExploreSearchBar from '../../components/ExploreSearchBar/ExploreSearchBar';
import BrowserTabsButton from '../../components/BrowserTabsButton/BrowserTabsButton';
import PillRow, { type PillOption } from '../../components/PillRow';
import ExploreSearchResults from '../../search/ExploreSearchResults';
import SearchFeedRow, {
  SearchFeedSkeleton,
  getItemId,
} from '../../search/SearchFeedRow';
import {
  getExploreSearchResultCount,
  trackExploreSearchAbandoned,
  trackExploreSearchEvent,
  trackExploreSearchOpened,
  useInstrumentedSearchEffect,
  useScrollTracking,
  type SearchFeedPill,
} from '../../search/analytics';
import {
  type SearchFeedId,
  useExploreSearch,
} from '../../search/useExploreSearch';
import PerpsSectionProvider from '../../feeds/perps/PerpsSectionProvider';
import SitesSearchFooter from '../../../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { useFloatingTabBarInset } from '../../../../../component-library/components/Navigation/TabBarFloating';
import { strings } from '../../../../../../locales/i18n';
import { useScreenTransitionComplete } from '../../../../hooks/useScreenTransitionComplete';
import { MAX_ITEMS_PER_SECTION } from '../../search/viewMoreLabel';
import { useExploreSearchFooterPress } from '../../search/useExploreSearchFooterPress';
import { selectBrowserTabCount } from '../../../../../reducers/browser/selectors';
import { useIsExploreHeaderRefreshEnabled } from '../../hooks/useIsExploreHeaderRefreshEnabled';
import Routes from '../../../../../constants/navigation/Routes';
import { ExploreSearchScreenSelectorsIDs } from './ExploreSearchScreen.testIds';
import {
  getTrimmedInitialQuery,
  type ExploreSearchRouteParams,
} from './ExploreSearchScreen.types';
import { useHomepageSearchPaste } from '../../search/useHomepageSearchPaste';
import {
  HOME_SEARCH_TRANSITION_DURATION,
  scheduleHomepageSearchReturnTransition,
} from '../../../../../util/homepageSearchTransition';

const ALL_PILL_KEY = 'all' as const;
type ActivePill = typeof ALL_PILL_KEY | SearchFeedId;

const SEARCH_LOADING_FEEDS: SearchFeedId[] = [
  'tokens',
  'perps',
  'predictions',
  'sites',
];

const ExploreSearchLoadingContent = () => {
  const tw = useTailwind();

  return (
    <Box twClassName="flex-1">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2 px-4 py-3"
      >
        {Array.from({ length: 5 }, (_, index) => (
          <Box key={index} twClassName="h-9 w-20 rounded-xl bg-muted" />
        ))}
      </Box>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4')}
      >
        {SEARCH_LOADING_FEEDS.map((feedId) => (
          <Box key={feedId} twClassName="mb-4">
            <Box twClassName="mb-2 h-6 w-32 rounded bg-muted" />
            {Array.from({ length: 3 }, (_, index) => (
              <SearchFeedSkeleton key={index} feedId={feedId} />
            ))}
          </Box>
        ))}
      </ScrollView>
    </Box>
  );
};

interface FullFeedListProps {
  feedId: SearchFeedId;
  searchQuery: string;
  analyticsSearchQuery: string;
  data: unknown[];
  isLoading?: boolean;
  title: string;
  tabName: SearchFeedPill;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  resultCount?: number;
}

const FullFeedList: React.FC<FullFeedListProps> = ({
  feedId,
  searchQuery,
  analyticsSearchQuery,
  data,
  isLoading,
  title,
  tabName,
  fetchMore,
  isFetchingMore,
  hasMore,
  resultCount,
}) => {
  const tw = useTailwind();
  const flashListRef = useRef<FlashListRef<unknown>>(null);
  const floatingTabBarInset = useFloatingTabBarInset();
  const [quickTradeToken, setQuickTradeToken] = useState<TrendingAsset | null>(
    null,
  );

  const { variant: quickBuyVariant } = useABTest(
    EXPLORE_QUICK_BUY_AB_KEY,
    EXPLORE_QUICK_BUY_VARIANTS,
    EXPLORE_QUICK_BUY_EXPOSURE_METADATA,
  );

  const closeQuickBuy = useCallback(() => {
    setQuickTradeToken(null);
  }, []);

  useQuickBuySearchKeyboard(quickTradeToken, closeQuickBuy);

  useEffect(() => {
    flashListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [searchQuery]);

  const { onScrollBeginDrag, resetScrollTracking } = useScrollTracking(
    'scrolled',
    analyticsSearchQuery,
    {
      tab_name: tabName,
      result_count: resultCount,
    },
  );

  useEffect(() => {
    resetScrollTracking();
  }, [searchQuery, resetScrollTracking]);

  const handleQuickTrade =
    (feedId === 'tokens' || feedId === 'stocks') &&
    quickBuyVariant.showQuickTradeButton
      ? setQuickTradeToken
      : undefined;

  const renderItem: ListRenderItem<unknown> = useCallback(
    ({ item, index }) => (
      <SearchFeedRow
        feedId={feedId}
        item={item}
        index={index}
        searchQuery={searchQuery}
        analyticsSearchQuery={analyticsSearchQuery}
        tabName={tabName}
        resultCount={resultCount}
        onQuickTrade={handleQuickTrade}
      />
    ),
    [
      feedId,
      searchQuery,
      analyticsSearchQuery,
      tabName,
      resultCount,
      handleQuickTrade,
    ],
  );

  const keyExtractor = useCallback(
    (item: unknown, index: number) =>
      `${feedId}-${getItemId(feedId, item) || index}`,
    [feedId],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && fetchMore) {
      fetchMore();
    }
  }, [hasMore, fetchMore]);

  const handleFooterPress = useExploreSearchFooterPress({
    searchQuery,
    tabName,
    resultCount,
  });

  const footer = useMemo(
    () => (
      <>
        {isFetchingMore && (
          <ActivityIndicator
            style={tw.style('py-4')}
            accessibilityLabel="Loading more results"
          />
        )}
        {feedId === 'sites' && (
          <SitesSearchFooter
            searchQuery={searchQuery}
            onPress={handleFooterPress}
          />
        )}
      </>
    ),
    [isFetchingMore, feedId, searchQuery, handleFooterPress, tw],
  );

  if (isLoading) {
    return (
      <Box twClassName="flex-1 px-4">
        {Array.from({ length: MAX_ITEMS_PER_SECTION }, (_, i) => (
          <SearchFeedSkeleton key={i} feedId={feedId} />
        ))}
      </Box>
    );
  }

  return (
    <>
      <FlashList
        ref={flashListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={tw.style(`px-4 pb-[${floatingTabBarInset}px]`)}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={onScrollBeginDrag}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={footer}
      />
      <TrendingQuickBuy token={quickTradeToken} onClose={closeQuickBuy} />
    </>
  );
};

interface ExploreSearchContentProps {
  searchQuery: string;
  redactSearchQuery: boolean;
}

/**
 * Renders the pill filter row and content pane for the search experience.
 * Must be a child of PerpsSectionProvider because useExploreSearch
 * internally calls usePerpsFeed, which requires PerpsStreamProvider.
 *
 * A single useExploreSearch instance is shared across the pill row and the
 * active content pane, so switching pills never triggers new API calls.
 */
const ExploreSearchContent: React.FC<ExploreSearchContentProps> = ({
  searchQuery,
  redactSearchQuery,
}) => {
  const [activePill, setActivePill] = useState<ActivePill>(ALL_PILL_KEY);
  const activePillRef = useRef(activePill);
  activePillRef.current = activePill;
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const { sections } = useExploreSearch(searchQuery, {
    exposePagination: true,
  });
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const isLoading = sections.some((s) => s.isLoading);

  const pills = useMemo<PillOption[]>(
    () => [
      { key: ALL_PILL_KEY, name: strings('trending.search_tabs.all') },
      ...sections.map((section) => ({
        key: section.feedId,
        name: section.title,
      })),
    ],
    [sections],
  );

  const activeSection = useMemo(
    () => sections.find((s) => s.feedId === activePill),
    [sections, activePill],
  );

  const getActivePill = useCallback(() => activePillRef.current, []);
  const getSections = useCallback(() => sectionsRef.current, []);

  useInstrumentedSearchEffect({
    searchQuery,
    redactSearchQuery,
    isLoading,
    getPill: getActivePill,
    getSections,
  });

  const handlePillSelect = useCallback(
    (key: string) => {
      const targetSections = sectionsRef.current;
      const resultCount = getExploreSearchResultCount(
        key as SearchFeedPill,
        targetSections,
      );
      trackExploreSearchEvent({
        interaction_type: 'tab_switched',
        search_query: redactSearchQuery ? '' : searchQueryRef.current,
        tab_name: key as SearchFeedPill,
        previous_tab: activePillRef.current,
        result_count: resultCount,
      });
      setActivePill(key as ActivePill);
    },
    [redactSearchQuery],
  );

  // Used by ExploreSearchResults' "View all" button — the analytics event is
  // already fired inside handleViewMore there, so we only update state here.
  const handleViewMoreSelect = useCallback((key: string) => {
    setActivePill(key as ActivePill);
  }, []);

  const showFeedList =
    activePill !== ALL_PILL_KEY &&
    (activeSection?.isLoading || (activeSection?.items.length ?? 0) > 0);

  const emptyFeedTitle =
    !showFeedList && activePill !== ALL_PILL_KEY
      ? activeSection?.title
      : undefined;

  return (
    <Box twClassName="flex-1">
      <PillRow
        pills={pills}
        activeKey={activePill}
        onSelect={handlePillSelect}
        testIdPrefix="explore-search"
      />
      {showFeedList ? (
        <FullFeedList
          key={activePill}
          feedId={activePill}
          searchQuery={searchQuery}
          analyticsSearchQuery={redactSearchQuery ? '' : searchQuery}
          data={activeSection?.items ?? []}
          isLoading={activeSection?.isLoading}
          title={activeSection?.title ?? activePill}
          tabName={activePill}
          fetchMore={activeSection?.fetchMore}
          isFetchingMore={activeSection?.isFetchingMore}
          hasMore={activeSection?.hasMore}
          resultCount={activeSection?.total ?? activeSection?.items.length}
        />
      ) : (
        <ExploreSearchResults
          searchQuery={searchQuery}
          analyticsSearchQuery={redactSearchQuery ? '' : searchQuery}
          sections={sections}
          onViewMore={handleViewMoreSelect}
          emptyFeedTitle={emptyFeedTitle}
          activeTab={activePill}
        />
      )}
    </Box>
  );
};

type SearchOrigin = NonNullable<ExploreSearchRouteParams['searchOrigin']>;

interface UseHomepageSearchHandoffOptions {
  isHomepageSearch: boolean;
  screenWidth: number;
  searchOrigin?: SearchOrigin;
}

const useHomepageSearchHandoff = ({
  isHomepageSearch,
  screenWidth,
  searchOrigin,
}: UseHomepageSearchHandoffOptions) => {
  const homeSearchTransition = useSharedValue(0);
  const homeSearchTransitionStarted = useRef(false);
  const isHomeSearchHandoff = isHomepageSearch && Boolean(searchOrigin);
  const [isHomepageSearchContentReady, setIsHomepageSearchContentReady] =
    useState(!isHomepageSearch || isHomeSearchHandoff);
  const [isHomeSearchAnimationComplete, setIsHomeSearchAnimationComplete] =
    useState(!isHomeSearchHandoff);
  const homeSearchAnimatedStyle = useAnimatedStyle(() => {
    if (!searchOrigin) {
      return {};
    }

    return {
      height: searchOrigin.height,
      left: interpolate(
        homeSearchTransition.value,
        [0, 1],
        [searchOrigin.x, 16],
      ),
      position: 'absolute',
      right: interpolate(
        homeSearchTransition.value,
        [0, 1],
        [screenWidth - searchOrigin.x - searchOrigin.width, 16],
      ),
      top: searchOrigin.y,
      zIndex: 10,
    };
  }, [screenWidth, searchOrigin]);

  useEffect(() => {
    if (!isHomepageSearch || isHomeSearchHandoff) {
      return;
    }

    // Let the input and its focus reaction paint before mounting all feeds.
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      timeout = setTimeout(() => {
        setIsHomepageSearchContentReady(true);
      }, 0);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isHomeSearchHandoff, isHomepageSearch]);

  useEffect(() => {
    if (
      !isHomepageSearch ||
      !searchOrigin ||
      homeSearchTransitionStarted.current
    ) {
      return;
    }

    homeSearchTransitionStarted.current = true;
    homeSearchTransition.value = withTiming(
      1,
      {
        duration: HOME_SEARCH_TRANSITION_DURATION,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          scheduleOnRN(setIsHomeSearchAnimationComplete, true);
        }
      },
    );
  }, [homeSearchTransition, isHomepageSearch, searchOrigin]);

  return {
    homeSearchAnimatedStyle,
    isHomeSearchAnimationComplete,
    isHomepageSearchContentReady,
    isHomeSearchHandoff,
  };
};

interface ExploreSearchHeaderProps {
  browserTabsCount: number;
  exploreSearchBar: React.ReactNode;
  homeSearchAnimatedStyle: AnimatedStyle<ViewStyle>;
  isHomepageSearch: boolean;
  onBrowserTabsPress: () => void;
  searchOrigin?: SearchOrigin;
  showBrowserTabsButton: boolean;
}

const ExploreSearchHeader = ({
  browserTabsCount,
  exploreSearchBar,
  homeSearchAnimatedStyle,
  isHomepageSearch,
  onBrowserTabsPress,
  searchOrigin,
  showBrowserTabsButton,
}: ExploreSearchHeaderProps) => {
  if (isHomepageSearch && searchOrigin) {
    return (
      <>
        <Animated.View style={homeSearchAnimatedStyle}>
          {exploreSearchBar}
        </Animated.View>
        <Box twClassName="h-12" />
      </>
    );
  }

  if (isHomepageSearch) {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="h-12 px-4"
      >
        <Box twClassName="flex-1">{exploreSearchBar}</Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-2 px-4 pb-3"
    >
      <Box twClassName="flex-1">{exploreSearchBar}</Box>
      {showBrowserTabsButton && (
        <BrowserTabsButton
          tabCount={browserTabsCount}
          onPress={onBrowserTabsPress}
          testID={ExploreSearchScreenSelectorsIDs.BROWSER_TABS_BUTTON}
        />
      )}
    </Box>
  );
};

const getSearchDismissVariant = (
  isHomepageSearch: boolean,
  isHeaderRefreshEnabled: boolean,
): 'back' | 'cancel' => {
  if (isHomepageSearch || isHeaderRefreshEnabled) {
    return 'back';
  }

  return 'cancel';
};

interface ShouldMountSearchContentOptions {
  isHomeSearchAnimationComplete: boolean;
  isHomepageSearch: boolean;
  isHomepageSearchContentReady: boolean;
  isHomeSearchHandoff: boolean;
  isTransitionComplete: boolean;
}

const shouldMountExploreSearchContent = ({
  isHomeSearchAnimationComplete,
  isHomepageSearch,
  isHomepageSearchContentReady,
  isHomeSearchHandoff,
  isTransitionComplete,
}: ShouldMountSearchContentOptions): boolean => {
  if (!isHomepageSearch) {
    return isTransitionComplete;
  }

  if (isHomeSearchHandoff) {
    return isHomeSearchAnimationComplete;
  }

  return isHomepageSearchContentReady;
};

const ExploreSearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<{ params: ExploreSearchRouteParams }, 'params'>>();
  const routeParams = route.params;
  const [searchQuery, setSearchQuery] = useState(() =>
    getTrimmedInitialQuery(routeParams?.initialQuery),
  );
  const [isClipboardQuery, setIsClipboardQuery] = useState(
    () => routeParams?.initialQuerySource === 'clipboard',
  );
  const isHomepageSearch = routeParams?.entryPoint === 'home';
  const searchOrigin = routeParams?.searchOrigin;
  const {
    homeSearchAnimatedStyle,
    isHomeSearchAnimationComplete,
    isHomepageSearchContentReady,
    isHomeSearchHandoff,
  } = useHomepageSearchHandoff({
    isHomepageSearch,
    screenWidth,
    searchOrigin,
  });
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setIsClipboardQuery(false);
  }, []);
  const handleHomepagePaste = useCallback((query: string) => {
    setSearchQuery(query);
    setIsClipboardQuery(true);
  }, []);
  const { showPastePill, handlePastePress } = useHomepageSearchPaste({
    enabled: isHomepageSearch,
    initiallyAvailable: routeParams?.pastePillVisible,
    onPaste: handleHomepagePaste,
  });
  // Gates the keyboard, which iOS paints dark grey mid-push, and the results
  // subtree, whose mount blocks the JS thread while the screen slides in.
  const isTransitionComplete = useScreenTransitionComplete();
  const isHeaderRefreshEnabled = useIsExploreHeaderRefreshEnabled();
  const browserTabsCount = useSelector(selectBrowserTabCount);
  const showBrowserTabsButton = isHeaderRefreshEnabled && browserTabsCount > 0;
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;
  const isClipboardQueryRef = useRef(isClipboardQuery);
  isClipboardQueryRef.current = isClipboardQuery;
  const isCancelPressedRef = useRef(false);

  useEffect(() => {
    // beforeRemove covers closing the screen (fires before blur); blur covers
    // leaving it mounted, e.g. switching away from the nav-bar Search tab.
    const unsubscribeFocus = navigation.addListener('focus', () => {
      isCancelPressedRef.current = false;
    });
    const unsubscribeBeforeRemove = navigation.addListener(
      'beforeRemove',
      () => {
        trackExploreSearchAbandoned(
          isCancelPressedRef.current ? 'cancel' : 'back',
          searchQueryRef.current,
          isClipboardQueryRef.current,
        );
      },
    );
    const unsubscribeBlur = navigation.addListener('blur', () => {
      trackExploreSearchAbandoned(
        isCancelPressedRef.current ? 'cancel' : 'navigate_away',
        searchQueryRef.current,
        isClipboardQueryRef.current,
      );
    });
    return () => {
      unsubscribeFocus();
      unsubscribeBeforeRemove();
      unsubscribeBlur();
    };
  }, [navigation]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    if (!routeParams?.entryPoint) {
      return;
    }

    setSearchQuery(getTrimmedInitialQuery(routeParams.initialQuery));
    setIsClipboardQuery(routeParams.initialQuerySource === 'clipboard');
    trackExploreSearchOpened(routeParams.entryPoint);
  }, [routeParams]);

  const handleSearchCancel = useCallback(() => {
    isCancelPressedRef.current = true;
    setSearchQuery('');
    Keyboard.dismiss();

    if (isHomeSearchHandoff && searchOrigin) {
      scheduleHomepageSearchReturnTransition({
        origin: searchOrigin,
        showPastePill,
      });
    }

    goBack();
  }, [goBack, isHomeSearchHandoff, searchOrigin, showPastePill]);

  const handleBrowserTabsPress = useCallback(() => {
    Keyboard.dismiss();
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        showTabsView: true,
        timestamp: Date.now(),
        fromExploreSearch: true,
      },
    });
  }, [navigation]);

  const searchPlaceholder = isHomepageSearch
    ? strings('wallet.homepage_search_placeholder')
    : undefined;
  const dismissVariant = getSearchDismissVariant(
    isHomepageSearch,
    isHeaderRefreshEnabled,
  );
  const exploreSearchBar = (
    <ExploreSearchBar
      type="interactive"
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
      onCancel={handleSearchCancel}
      placeholder={searchPlaceholder}
      autoFocus={
        (isHomepageSearch || isTransitionComplete) &&
        isHomeSearchAnimationComplete
      }
      dismissVariant={dismissVariant}
      showPastePill={showPastePill}
      onPastePress={handlePastePress}
      clipboardButtonTestID="homepage-search-clipboard-button"
      rowTwClassName={isHomepageSearch ? 'flex-1' : undefined}
    />
  );

  const shouldMountSearchContent = shouldMountExploreSearchContent({
    isHomeSearchAnimationComplete,
    isHomepageSearch,
    isHomepageSearchContentReady,
    isHomeSearchHandoff,
    isTransitionComplete,
  });

  return (
    <Box twClassName="flex-1">
      <Box
        style={{
          paddingTop: insets.top + (Platform.OS === 'android' ? 16 : 0),
        }}
        twClassName="flex-1 bg-default"
      >
        <ExploreSearchHeader
          browserTabsCount={browserTabsCount}
          exploreSearchBar={exploreSearchBar}
          homeSearchAnimatedStyle={homeSearchAnimatedStyle}
          isHomepageSearch={isHomepageSearch}
          onBrowserTabsPress={handleBrowserTabsPress}
          searchOrigin={searchOrigin}
          showBrowserTabsButton={showBrowserTabsButton}
        />

        <PerpsSectionProvider>
          {shouldMountSearchContent ? (
            <ExploreSearchContent
              searchQuery={searchQuery}
              redactSearchQuery={isClipboardQuery}
            />
          ) : (
            <ExploreSearchLoadingContent />
          )}
        </PerpsSectionProvider>
      </Box>
    </Box>
  );
};

export default ExploreSearchScreen;
