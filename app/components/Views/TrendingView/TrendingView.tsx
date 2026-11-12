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

/**
 * Tab order here must stay paired with `EXPLORE_TAB_INDEX` in
 * `app/constants/navigation/exploreTabIndices.ts`: deeplinks and analytics
 * resolve tab positions against the constants while this array's order
 * drives the tab bar, routes and pager. A unit test pins the pairing.
 */
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
  /** No-ops when the pager is already on `tabIndex`; callers that need to
   * distinguish the two (e.g. the deeplink effect's analytics) must check
   * `getCurrentIndex()` first. */
  goToTabIndex: (tabIndex: number) => void;
  getCurrentIndex: () => number;
}

const useExploreTabNavigationEffect = (opts: {
  exploreTabsRef: React.RefObject<ExploreTabsHandle | null>;
  tabNames: ExploreTabName[];
  pendingExploreEntrySourceRef: React.MutableRefObject<string | undefined>;
  previousTabRef: React.MutableRefObject<ExploreTabName>;
}) => {
  const {
    exploreTabsRef,
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

      const currentIndex = exploreTabsRef.current?.getCurrentIndex();
      exploreTabsRef.current?.goToTabIndex(initialTabIndex);

      // goToTabIndex only switches tabs when the index actually changes.
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
      exploreTabsRef,
      initialTabIndex,
      pendingExploreEntrySourceRef,
      previousTabRef,
      setParams,
      tabNames,
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
 *
 * `scenes` (the six tab elements) is created once by the caller and forwarded
 * here untouched — never re-created inline — so `renderScene` returns the same
 * element reference per route when this component re-renders. React bails out
 * of re-rendering the inactive pages' subtrees on a tab switch; only
 * components that read `useExploreActiveTab` (e.g. `PerpsBlock`) update,
 * matching the context's intent.
 */
const ExploreTabs = forwardRef<ExploreTabsHandle, ExploreTabsProps>(
  ({ previousTabRef, pendingExploreEntrySourceRef, scenes }, ref) => {
    const tw = useTailwind();
    // `activeIndex` is the pager's target page (what the bar highlights);
    // `pageActiveIndex` (from `usePageActivation`) is the settled, visible
    // page that feeds `ExploreActiveTabContext`.
    const [activeIndex, setActiveIndex] = useState<number>(
      EXPLORE_TAB_INDEX.NOW,
    );
    const { pageActiveIndex, activate, onPagerRest } = usePageActivation(
      EXPLORE_TAB_INDEX.NOW,
    );
    // Set by `handleTabPress` and read once by `handleIndexChange` as `isTap`.
    // Imperative navigation (deeplink `goToTabIndex`) deliberately leaves it
    // false so the destination tab activates immediately, like a swipe.
    const tabBarPressRef = useRef(false);
    // Mirrors `activeIndex` without waiting for an effect, so dedupe and
    // `getCurrentIndex` see the index as soon as the pager reports it.
    const activeIndexRef = useRef(activeIndex);

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
        goToTabIndex: (tabIndex: number) => handleIndexChange(tabIndex),
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
      ({ route }: { route: TabViewRoute }) =>
        scenes[route.key as ExploreTabKey],
      [scenes],
    );

    return (
      <ExploreActiveTabProvider activeTab={TAB_NAMES[pageActiveIndex]}>
        <Box twClassName="flex-1" testID="explore-tabs">
          <TabView
            navigationState={navigationState}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            onIndexChange={handleIndexChange}
            // Revisited tabs defer their context update to `onPagerRest`:
            // tab-view 4.3.4's PagerViewAdapter maps the pager's settled
            // `pageScrollState: 'idle'` (including after a programmatic bar
            // tap) to `onSwipeEnd`. An adapter or upgrade that only fires it
            // after real swipes would leave `ExploreActiveTabContext` stale
            // until the next switch.
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
  const exploreTabsRef = useRef<ExploreTabsHandle>(null);
  const sessionManager = TrendingFeedSessionManager.getInstance();
  const previousTabRef = useRef<ExploreTabName>('Now');
  const pendingExploreEntrySourceRef = useRef<string | undefined>(undefined);

  // Handle tab navigation from route params
  useExploreTabNavigationEffect({
    exploreTabsRef,
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

  // Created once per `tabProps` identity (not on every render) so
  // `ExploreTabs` returns the same element per route on every tab switch —
  // see `ExploreTabs` for why that reference stability is what keeps every
  // loaded feed from re-rendering when only the active tab changes.
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
            ref={exploreTabsRef}
            previousTabRef={previousTabRef}
            pendingExploreEntrySourceRef={pendingExploreEntrySourceRef}
            scenes={scenes}
          />
        )}
      </Box>
    </Box>
  );
};
