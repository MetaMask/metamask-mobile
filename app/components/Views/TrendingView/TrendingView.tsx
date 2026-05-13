import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
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
  TabsBar,
  TabItem,
} from '../../../component-library/components-temp/Tabs';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
import Routes from '../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectExplorePageV2EnabledFlag } from '../../../selectors/featureFlagController/explorePageV2';
import BasicFunctionalityEmptyState from '../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import ExploreSearchBar from './components/ExploreSearchBar/ExploreSearchBar';
import { useExploreRefresh } from './hooks/useExploreRefresh';
import NowTab from './tabs/NowTab';
import MacroTab from './tabs/MacroTab';
import RwasTab from './tabs/RwasTab';
import CryptoTab from './tabs/CryptoTab';
import SportsTab from './tabs/SportsTab';
import DappsTab from './tabs/DappsTab';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import ExplorePageV1 from './ExplorePageV1';
import {
  trackExploreInteracted,
  type ExploreTabName,
} from './search/analytics';

const TAB_NAMES: ExploreTabName[] = [
  'Now',
  'Macro',
  'RWAs',
  'Crypto',
  'Sports',
  'Sites',
];

// Module-level constant — strings() is pure and locale doesn't change at runtime.
const TAB_ITEMS: TabItem[] = [
  { key: 'Now', label: strings('trending.tabs.now'), content: null },
  { key: 'Macro', label: strings('trending.tabs.macro'), content: null },
  { key: 'RWAs', label: strings('trending.tabs.rwas'), content: null },
  { key: 'Crypto', label: strings('trending.tabs.crypto'), content: null },
  { key: 'Sports', label: strings('trending.tabs.sports'), content: null },
  // i18n key is 'dapps' for historical reasons; the display label is "Sites".
  { key: 'Sites', label: strings('trending.tabs.dapps'), content: null },
];

export const EXPLORE_TAB_INDEX = {
  NOW: 0,
  MACRO: 1,
  RWAS: 2,
  CRYPTO: 3,
  SPORTS: 4,
  SITES: 5,
} as const;

interface ExploreFeedRouteParams {
  initialTab?: number | null;
}

const useExploreTabNavigationEffect = (opts: {
  pagerRef: React.RefObject<PagerView | null>;
  switchToTab: (index: number) => void;
}) => {
  const { pagerRef, switchToTab } = opts;
  const route =
    useRoute<RouteProp<{ params: ExploreFeedRouteParams }, 'params'>>();
  const { setParams } = useNavigation();
  const initialTabIndex = Object.values(EXPLORE_TAB_INDEX).find(
    (tab) => tab === route.params?.initialTab,
  );

  useFocusEffect(
    useCallback(() => {
      if (initialTabIndex === undefined) {
        return;
      }

      pagerRef.current?.setPage(initialTabIndex);
      switchToTab(initialTabIndex);
      setParams?.({ initialTab: null });
    }, [initialTabIndex, setParams, pagerRef, switchToTab]),
  );
};

export const ExploreFeed: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const tabProps = useExploreRefresh();
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Tracks which tab indices have ever been visited so we only mount a tab's
  // content (and trigger its data fetches) the first time the user visits it.
  const [mountedTabs, setMountedTabs] = useState<Set<number>>(
    () => new Set([0]),
  );
  const sessionManager = TrendingFeedSessionManager.getInstance();
  const previousTabRef = useRef<ExploreTabName>('Now');

  const switchToTab = useCallback((index: number) => {
    const destinationTab = TAB_NAMES[index];
    if (!destinationTab) return;

    setMountedTabs((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setActiveIndex(index);

    trackExploreInteracted({
      interaction_type: 'tab_switched',
      tab_name: destinationTab,
      previous_tab: previousTabRef.current,
    });
    previousTabRef.current = destinationTab;
  }, []);

  useExploreTabNavigationEffect({ pagerRef, switchToTab });

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
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isExplorePageV2Enabled = useSelector(selectExplorePageV2EnabledFlag);

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
    navigation.navigate(Routes.EXPLORE_SEARCH);
  }, [navigation]);

  const handleTabBarPress = useCallback(
    (index: number) => {
      pagerRef.current?.setPage(index);
      switchToTab(index);
    },
    [switchToTab],
  );

  const handlePageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      switchToTab(e.nativeEvent.position);
    },
    [switchToTab],
  );

  return (
    <SafeAreaView
      edges={{ top: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={TrendingViewSelectorsIDs.EXPLORE_SAFE_AREA}
    >
      <HeaderRoot
        title={strings('trending.title')}
        testID={TrendingViewSelectorsIDs.EXPLORE_HEADER_ROOT}
      />

      <Box twClassName="gap-4 flex-1">
        <Box twClassName="mt-2 mb-2 flex-row items-center gap-2 px-4">
          <Box twClassName="flex-1">
            <ExploreSearchBar type="button" onPress={handleSearchPress} />
          </Box>

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
        </Box>

        {!isBasicFunctionalityEnabled ? (
          <BasicFunctionalityEmptyState />
        ) : isExplorePageV2Enabled ? (
          <Box twClassName="flex-1">
            <TabsBar
              tabs={TAB_ITEMS}
              activeIndex={activeIndex}
              onTabPress={handleTabBarPress}
            />
            <PagerView
              ref={pagerRef}
              style={tw.style('flex-1')}
              initialPage={0}
              onPageSelected={handlePageSelected}
            >
              <View key="now" style={tw.style('flex-1')} collapsable={false}>
                {mountedTabs.has(0) && <NowTab {...tabProps} />}
              </View>
              <View key="macro" style={tw.style('flex-1')} collapsable={false}>
                {mountedTabs.has(1) && <MacroTab {...tabProps} />}
              </View>
              <View key="rwas" style={tw.style('flex-1')} collapsable={false}>
                {mountedTabs.has(2) && <RwasTab {...tabProps} />}
              </View>
              <View key="crypto" style={tw.style('flex-1')} collapsable={false}>
                {mountedTabs.has(3) && <CryptoTab {...tabProps} />}
              </View>
              <View key="sports" style={tw.style('flex-1')} collapsable={false}>
                {mountedTabs.has(4) && <SportsTab {...tabProps} />}
              </View>
              <View key="dapps" style={tw.style('flex-1')} collapsable={false}>
                {mountedTabs.has(5) && <DappsTab {...tabProps} />}
              </View>
            </PagerView>
          </Box>
        ) : (
          <ExplorePageV1 {...tabProps} />
        )}
      </Box>
    </SafeAreaView>
  );
};
