import React, { useCallback, useEffect, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import TabsList from '../../../component-library/components-temp/Tabs/TabsList/TabsList';
import { TabViewProps } from '../../../component-library/components-temp/Tabs/TabsList/TabsList.types';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
import Routes from '../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectExplorePageV2EnabledFlag } from '../../../selectors/featureFlagController/explorePageV2';
import BasicFunctionalityEmptyState from '../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import ExploreSearchBar from './components/ExploreSearchBar/ExploreSearchBar';
import { useExploreTabNavigationEffect } from './hooks/useExploreTabNavigationEffect';
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

export const EXPLORE_TAB_INDEX = {
  NOW: 0,
  MACRO: 1,
  RWAS: 2,
  CRYPTO: 3,
  SPORTS: 4,
  SITES: 5,
} as const;

const TAB_NAMES_BY_INDEX: Record<number, ExploreTabName> = {
  [EXPLORE_TAB_INDEX.NOW]: 'Now',
  [EXPLORE_TAB_INDEX.MACRO]: 'Macro',
  [EXPLORE_TAB_INDEX.RWAS]: 'RWAs',
  [EXPLORE_TAB_INDEX.CRYPTO]: 'Crypto',
  [EXPLORE_TAB_INDEX.SPORTS]: 'Sports',
  [EXPLORE_TAB_INDEX.SITES]: 'Sites',
};


export const ExploreFeed: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const tabProps = useExploreRefresh();
  const { tabsListRef, initialActiveIndex } = useExploreTabNavigationEffect({
    defaultTabIndex: EXPLORE_TAB_INDEX.NOW,
  });

  const sessionManager = TrendingFeedSessionManager.getInstance();

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

  const previousTabRef = useRef<ExploreTabName>('Now');

  const handleTabChange = useCallback(({ i }: { i: number }) => {
    const destinationTab = TAB_NAMES_BY_INDEX[i];
    if (!destinationTab) return;
    trackExploreInteracted({
      interaction_type: 'tab_switched',
      tab_name: destinationTab,
      previous_tab: previousTabRef.current,
    });
    previousTabRef.current = destinationTab;
  }, []);

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
          <TabsList
            ref={tabsListRef}
            initialActiveIndex={initialActiveIndex}
            tabsListContentTwClassName="px-0 pb-3"
            onChangeTab={handleTabChange}
          >
            <Box
              key="now"
              twClassName="flex-1"
              {...({ tabLabel: strings('trending.tabs.now') } as TabViewProps)}
            >
              <NowTab {...tabProps} />
            </Box>
            <Box
              key="macro"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.macro'),
              } as TabViewProps)}
            >
              <MacroTab {...tabProps} />
            </Box>
            <Box
              key="rwas"
              twClassName="flex-1"
              {...({ tabLabel: strings('trending.tabs.rwas') } as TabViewProps)}
            >
              <RwasTab {...tabProps} />
            </Box>
            <Box
              key="crypto"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.crypto'),
              } as TabViewProps)}
            >
              <CryptoTab {...tabProps} />
            </Box>
            <Box
              key="sports"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.sports'),
              } as TabViewProps)}
            >
              <SportsTab {...tabProps} />
            </Box>
            <Box
              key="dapps"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.dapps'),
              } as TabViewProps)}
            >
              <DappsTab {...tabProps} />
            </Box>
          </TabsList>
        ) : (
          <ExplorePageV1 {...tabProps} />
        )}
      </Box>
    </SafeAreaView>
  );
};
