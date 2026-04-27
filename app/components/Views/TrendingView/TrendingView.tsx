import React, { useCallback, useEffect, useState } from 'react';
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
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import ExploreSearchBar from './components/ExploreSearchBar/ExploreSearchBar';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import BasicFunctionalityEmptyState from '../../UI/BasicFunctionality/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import TrendingFeedSessionManager from '../../UI/Trending/services/TrendingFeedSessionManager';
import { RefreshConfig } from './components/Sections/Section';
import { TrendingViewSelectorsIDs } from './TrendingView.testIds';
import { ExploreTabPanel } from './tabs/ExploreTabPanels';

export const ExploreFeed: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshConfig, setRefreshConfig] = useState<RefreshConfig>({
    trigger: 0,
    silentRefresh: true,
  });

  const sessionManager = TrendingFeedSessionManager.getInstance();

  // REMOVED FOR NOW (https://consensys.slack.com/archives/C07NF2K42LE/p1766152712027759?thread_ts=1766135783.241539&cid=C07NF2K42LE)
  // Trigger refresh only when navigating to an already-mounted screen
  // useEffect(() => {
  //   const params = route.params as { refresh?: boolean } | undefined;

  //   // Skip refresh on first mount
  //   if (isFirstMount.current) {
  //     isFirstMount.current = false;
  //     return;
  //   }

  //   if (params?.refresh === true) {
  //     // Silent refresh - don't show skeletons
  //     setRefreshConfig((prev) => ({
  //       trigger: prev.trigger + 1,
  //       silentRefresh: false,
  //     }));
  //   }
  // }, [route.params]);

  // Initialize session and enable AppState listener on mount
  useEffect(() => {
    // Enable AppState listener to detect app backgrounding
    sessionManager.enableAppStateListener();

    // Start session
    sessionManager.startSession('trending_feed');

    return () => {
      // End session and disable listener on unmount
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

  const handleBrowserPress = useCallback(() => {
    if (browserTabsCount > 0) {
      // If tabs exist, show the tabs view directly
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          showTabsView: true,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    } else {
      // If no tabs exist, open a new tab with portfolio URL
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

  // Clean up timeout when component unmounts or refreshing changes
  useEffect(() => {
    if (refreshing) {
      const timeoutId = setTimeout(() => {
        setRefreshing(false);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [refreshing]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Pull-to-refresh - show skeletons
    setRefreshConfig((prev) => ({
      trigger: prev.trigger + 1,
      silentRefresh: true,
    }));
  }, []);

  const exploreTabPanelProps = {
    refreshConfig,
    refreshing,
    onRefresh: handleRefresh,
    colors,
    tw,
  };

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
        <Box twClassName="flex-row items-center gap-2 px-4">
          <Box twClassName="flex-1">
            <ExploreSearchBar type="button" onPress={handleSearchPress} />
          </Box>

          <TouchableOpacity
            onPress={handleBrowserPress}
            testID="trending-view-browser-button"
          >
            {browserTabsCount > 0 ? (
              <Box twClassName="rounded-md items-center justify-center h-8 w-8 border-2 border-text-default">
                <Text variant={TextVariant.BodyLg}>{browserTabsCount}</Text>
              </Box>
            ) : (
              <Icon name={IconName.Explore} size={IconSize.Xl} />
            )}
          </TouchableOpacity>
        </Box>

        {isBasicFunctionalityEnabled ? (
          <TabsList tabsListContentTwClassName="px-0 pb-3">
            <Box
              key="now"
              twClassName="flex-1"
              {...({ tabLabel: strings('trending.tabs.now') } as TabViewProps)}
            >
              <ExploreTabPanel tab="now" {...exploreTabPanelProps} />
            </Box>
            <Box
              key="macro"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.macro'),
              } as TabViewProps)}
            >
              <ExploreTabPanel tab="macro" {...exploreTabPanelProps} />
            </Box>
            <Box
              key="rwas"
              twClassName="flex-1"
              {...({ tabLabel: strings('trending.tabs.rwas') } as TabViewProps)}
            >
              <ExploreTabPanel tab="rwas" {...exploreTabPanelProps} />
            </Box>
            <Box
              key="crypto"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.crypto'),
              } as TabViewProps)}
            >
              <ExploreTabPanel tab="crypto" {...exploreTabPanelProps} />
            </Box>
            <Box
              key="sports"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.sports'),
              } as TabViewProps)}
            >
              <ExploreTabPanel tab="sports" {...exploreTabPanelProps} />
            </Box>
            <Box
              key="dapps"
              twClassName="flex-1"
              {...({
                tabLabel: strings('trending.tabs.dapps'),
              } as TabViewProps)}
            >
              <ExploreTabPanel tab="dapps" {...exploreTabPanelProps} />
            </Box>
          </TabsList>
        ) : (
          <BasicFunctionalityEmptyState />
        )}
      </Box>
    </SafeAreaView>
  );
};
