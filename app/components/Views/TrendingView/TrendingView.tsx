import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TouchableOpacity } from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { TabView } from 'react-native-tab-view';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  IconName,
  Icon,
  IconSize,
} from '@metamask/design-system-react-native';
import HeaderRoot from '../../../component-library/components-temp/HeaderRoot';
import {
  TabViewBar,
  TAB_VIEW_INITIAL_LAYOUT,
  usePageActivation,
  type TabViewBarProps,
  type TabViewRoute,
} from '../../../component-library/components-temp/Tabs';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
import Routes from '../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectExploreBrandRefreshEnabled } from '../../../selectors/featureFlagController/exploreBrandRefresh';
import { useIsGlassSurfaceEnabled } from '../../hooks/useIsGlassSurfaceEnabled';
import BasicFunctionalityEmptyState from '../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import ExploreSearchBar from './components/ExploreSearchBar/ExploreSearchBar';
import BrowserTabsButton from './components/BrowserTabsButton/BrowserTabsButton';
import { ExploreActiveTabProvider } from './ExploreActiveTabContext';
import { useExploreRefresh } from './hooks/useExploreRefresh';
import { useIsExploreHeaderRefreshEnabled } from './hooks/useIsExploreHeaderRefreshEnabled';
import NowTab from './tabs/NowTab';
import PerpsTab from './tabs/PerpsTab';
import RwasTab from './tabs/RwasTab';
import CryptoTab from './tabs/CryptoTab';
import SportsTab from './tabs/SportsTab';
import DappsTab from './tabs/DappsTab';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import {
  trackExploreInteracted,
  trackExploreSearchOpened,
  type ExploreTabName,
} from './search/analytics';
import { EXPLORE_TAB_INDEX } from '../../../constants/navigation/exploreTabIndices';

export const EXPLORE_TAB_DEFINITIONS = [
  { key: 'now', name: 'Now', titleKey: 'trending.tabs.now' },
  { key: 'crypto', name: 'Crypto', titleKey: 'trending.tabs.crypto' },
  { key: 'perps', name: 'Perps', titleKey: 'trending.tabs.perps' },
  { key: 'rwas', name: 'RWAs', titleKey: 'trending.tabs.rwas' },
  { key: 'sports', name: 'Sports', titleKey: 'trending.tabs.sports' },
  { key: 'dapps', name: 'Sites', titleKey: 'trending.tabs.dapps' },
] as const;

type ExploreTabKey = (typeof EXPLORE_TAB_DEFINITIONS)[number]['key'];

const TAB_NAMES: ExploreTabName[] = EXPLORE_TAB_DEFINITIONS.map(
  ({ name }) => name,
);

export { EXPLORE_TAB_INDEX } from '../../../constants/navigation/exploreTabIndices';

export interface ExploreFeedRouteParams {
  initialTab?: number | null;
  /** Entry surface for `tab_switched` analytics (e.g. `deeplink`). */
  source?: string;
}

export interface ExploreTabsHandle {
  goToTabIndex: (tabIndex: number) => void;
  getCurrentIndex: () => number;
}

const useExploreTabNavigationEffect = (opts: {
  tabsListRef: React.RefObject<ExploreTabsHandle | null>;
  tabNames: ExploreTabName[];
  pendingExploreEntrySourceRef: React.MutableRefObject<string | undefined>;
  previousTabRef: React.MutableRefObject<ExploreTabName>;
}) => {
  const {
    tabsListRef,
    tabNames,
    pendingExploreEntrySourceRef,
    previousTabRef,
  } = opts;
  const route =
    useRoute<RouteProp<{ params: ExploreFeedRouteParams }, 'params'>>();
  const { setParams } = useNavigation<AppNavigationProp>();
  const initialTabIndex = Object.values(EXPLORE_TAB_INDEX).find(
    (tab) => tab === route.params?.initialTab,
  );
  const entrySource = route.params?.source;

  useFocusEffect(
    useCallback(() => {
      if (initialTabIndex === undefined) {
        return;
      }

      const destinationTab = tabNames[initialTabIndex];
      if (entrySource) {
        pendingExploreEntrySourceRef.current = entrySource;
      }

      const currentIndex = tabsListRef.current?.getCurrentIndex();
      tabsListRef.current?.goToTabIndex(initialTabIndex);

      // goToTabIndex only switches the tab when the index actually changes.
      if (entrySource && destinationTab && currentIndex === initialTabIndex) {
        pendingExploreEntrySourceRef.current = undefined;
        trackExploreInteracted({
          interaction_type: 'tab_switched',
          tab_name: destinationTab,
          previous_tab: previousTabRef.current,
          source: entrySource,
        });
      } else if (
        entrySource &&
        pendingExploreEntrySourceRef.current === entrySource
      ) {
        // Tab switch did not run (e.g. tabs not mounted) — discard stale source.
        pendingExploreEntrySourceRef.current = undefined;
      }

      setParams?.({ initialTab: null, source: undefined });
    }, [
      entrySource,
      initialTabIndex,
      pendingExploreEntrySourceRef,
      previousTabRef,
      setParams,
      tabNames,
      tabsListRef,
    ]),
  );
};

interface ExploreTabsProps {
  previousTabRef: React.MutableRefObject<ExploreTabName>;
  pendingExploreEntrySourceRef: React.MutableRefObject<string | undefined>;
  scenes: Record<ExploreTabKey, React.ReactElement>;
}

/**
 * Owns the pager index and renders the `ExploreActiveTabProvider`/`TabView`
 * pair, so a tab switch only re-renders this small subtree instead of all of
 * `ExploreFeed`.
 */
const useExploreTabsController = (opts: {
  ref: React.ForwardedRef<ExploreTabsHandle>;
  previousTabRef: React.MutableRefObject<ExploreTabName>;
  pendingExploreEntrySourceRef: React.MutableRefObject<string | undefined>;
  scenes: Record<ExploreTabKey, React.ReactElement>;
}) => {
  const { ref, previousTabRef, pendingExploreEntrySourceRef, scenes } = opts;
  const route =
    useRoute<RouteProp<{ params: ExploreFeedRouteParams }, 'params'>>();
  const [landingIndex] = useState(
    () =>
      Object.values(EXPLORE_TAB_INDEX).find(
        (tab) => tab === route.params?.initialTab,
      ) ?? EXPLORE_TAB_INDEX.NOW,
  );
  const [activeIndex, setActiveIndex] = useState<number>(landingIndex);
  const { pageActiveIndex, activate, onPagerRest } =
    usePageActivation(landingIndex);
  const activeIndexRef = useRef<number>(landingIndex);
  const tabBarPressRef = useRef(false);

  const routes = useMemo<TabViewRoute[]>(
    () =>
      EXPLORE_TAB_DEFINITIONS.map(({ key, titleKey }) => ({
        key,
        title: strings(titleKey),
      })),
    [],
  );
  const navigationState = useMemo(
    () => ({ index: activeIndex, routes }),
    [activeIndex, routes],
  );

  const handleTabPress = useCallback((index: number) => {
    tabBarPressRef.current = index !== activeIndexRef.current;
  }, []);

  const handleIndexChange = useCallback(
    (index: number) => {
      if (index === activeIndexRef.current) {
        return;
      }
      const destinationTab = TAB_NAMES[index];
      if (!destinationTab) return;
      const isTap = tabBarPressRef.current;
      tabBarPressRef.current = false;
      const source = pendingExploreEntrySourceRef.current;
      pendingExploreEntrySourceRef.current = undefined;
      trackExploreInteracted({
        interaction_type: 'tab_switched',
        tab_name: destinationTab,
        previous_tab: previousTabRef.current,
        ...(source ? { source } : {}),
      });
      previousTabRef.current = destinationTab;
      activeIndexRef.current = index;
      setActiveIndex(index);
      activate(index, isTap);
    },
    [activate, pendingExploreEntrySourceRef, previousTabRef],
  );

  useImperativeHandle(
    ref,
    () => ({
      goToTabIndex: handleIndexChange,
      getCurrentIndex: () => activeIndexRef.current,
    }),
    [handleIndexChange],
  );

  const renderTabBar = useCallback(
    (props: TabViewBarProps) => (
      <TabViewBar
        {...props}
        onTabPress={handleTabPress}
        testID="explore-tabs-bar"
      />
    ),
    [handleTabPress],
  );

  const renderScene = useCallback(
    ({ route: sceneRoute }: { route: TabViewRoute }) =>
      scenes[sceneRoute.key as ExploreTabKey],
    [scenes],
  );

  return {
    activeTab: TAB_NAMES[pageActiveIndex],
    navigationState,
    renderTabBar,
    renderScene,
    handleIndexChange,
    onPagerRest,
  };
};

const ExploreTabs = forwardRef<ExploreTabsHandle, ExploreTabsProps>(
  ({ previousTabRef, pendingExploreEntrySourceRef, scenes }, ref) => {
    const tw = useTailwind();
    const {
      activeTab,
      navigationState,
      renderTabBar,
      renderScene,
      handleIndexChange,
      onPagerRest,
    } = useExploreTabsController({
      ref,
      previousTabRef,
      pendingExploreEntrySourceRef,
      scenes,
    });

    return (
      <ExploreActiveTabProvider activeTab={activeTab}>
        <Box twClassName="flex-1" testID="explore-tabs">
          <TabView
            navigationState={navigationState}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            onIndexChange={handleIndexChange}
            onSwipeEnd={onPagerRest}
            initialLayout={TAB_VIEW_INITIAL_LAYOUT}
            lazy
            style={tw.style('flex-1')}
          />
        </Box>
      </ExploreActiveTabProvider>
    );
  },
);

ExploreTabs.displayName = 'ExploreTabs';

export const ExploreFeed: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const tabProps = useExploreRefresh();
  const tabsListRef = useRef<ExploreTabsHandle>(null);
  const sessionManager = TrendingFeedSessionManager.getInstance();
  const previousTabRef = useRef<ExploreTabName>('Now');
  const pendingExploreEntrySourceRef = useRef<string | undefined>(undefined);

  // Handle tab navigation from route params
  useExploreTabNavigationEffect({
    tabsListRef,
    tabNames: TAB_NAMES,
    pendingExploreEntrySourceRef,
    previousTabRef,
  });

  // Initialize session and enable AppState listener on mount
  useEffect(() => {
    sessionManager.enableAppStateListener();
    sessionManager.startSession('trending_feed');

    return () => {
      sessionManager.endSession();
      sessionManager.disableAppStateListener();
    };
  }, [sessionManager]);

  const portfolioUrl = buildPortfolioUrlWithMetrics(AppConstants.PORTFOLIO.URL);

  const browserTabsCount = useSelector(
    (state: { browser: { tabs: unknown[] } }) => state.browser.tabs.length,
  );
  const isHeaderRefreshEnabled = useIsExploreHeaderRefreshEnabled();
  const isSearchGlass = useIsGlassSurfaceEnabled(
    selectExploreBrandRefreshEnabled,
  );
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const handleBrowserPress = useCallback(() => {
    if (browserTabsCount > 0) {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          showTabsView: true,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    } else {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: portfolioUrl.href,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    }
  }, [navigation, portfolioUrl.href, browserTabsCount]);

  const handleSearchPress = useCallback(() => {
    trackExploreSearchOpened('explore');
    navigation.navigate(Routes.EXPLORE_SEARCH, { entryPoint: 'explore' });
  }, [navigation]);

  const scenes = useMemo<Record<ExploreTabKey, React.ReactElement>>(
    () => ({
      now: <NowTab {...tabProps} />,
      crypto: <CryptoTab {...tabProps} />,
      perps: <PerpsTab {...tabProps} />,
      rwas: <RwasTab {...tabProps} />,
      sports: <SportsTab {...tabProps} />,
      dapps: <DappsTab {...tabProps} />,
    }),
    [tabProps],
  );

  return (
    <Box
      style={tw.style('flex-1 bg-default')}
      testID={TrendingViewSelectorsIDs.EXPLORE_SAFE_AREA}
    >
      <HeaderRoot
        includesTopInset
        title={strings('trending.title')}
        testID={TrendingViewSelectorsIDs.EXPLORE_HEADER_ROOT}
      />

      <Box twClassName="gap-4 flex-1">
        <Box twClassName="mt-4 mb-2 flex-row items-center gap-2 px-4">
          <Box twClassName="flex-1">
            <ExploreSearchBar
              type="button"
              onPress={handleSearchPress}
              isGlass={isSearchGlass}
            />
          </Box>

          {isHeaderRefreshEnabled && browserTabsCount > 0 ? (
            <BrowserTabsButton
              tabCount={browserTabsCount}
              onPress={handleBrowserPress}
              testID="trending-view-browser-button"
              isGlass={isSearchGlass}
            />
          ) : (
            <TouchableOpacity
              onPress={handleBrowserPress}
              testID="trending-view-browser-button"
            >
              {browserTabsCount > 0 ? (
                <Box twClassName="rounded-lg items-center justify-center h-8 w-8 border border-muted bg-section">
                  <Text variant={TextVariant.BodyMd}>{browserTabsCount}</Text>
                </Box>
              ) : (
                <Icon name={IconName.Explore} size={IconSize.Xl} />
              )}
            </TouchableOpacity>
          )}
        </Box>

        {!isBasicFunctionalityEnabled ? (
          <BasicFunctionalityEmptyState />
        ) : (
          <ExploreTabs
            ref={tabsListRef}
            previousTabRef={previousTabRef}
            pendingExploreEntrySourceRef={pendingExploreEntrySourceRef}
            scenes={scenes}
          />
        )}
      </Box>
    </Box>
  );
};
