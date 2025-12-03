import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
import { useTheme } from '../../../util/theme';
import Routes from '../../../constants/navigation/Routes';
import {
  lastTrendingScreenRef,
  updateLastTrendingScreen,
} from '../../Nav/Main/MainNavigator';
import ExploreSearchScreen from './ExploreSearchScreen/ExploreSearchScreen';
import ExploreSearchBar from './ExploreSearchBar/ExploreSearchBar';
import QuickActions from './components/QuickActions/QuickActions';
import SectionHeader from './components/SectionHeader/SectionHeader';
import { HOME_SECTIONS_ARRAY, useSectionsData } from './config/sections.config';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import BasicFunctionalityEmptyState from './components/BasicFunctionalityEmptyState/BasicFunctionalityEmptyState';
import { PerpsConnectionProvider } from '../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../UI/Perps/providers/PerpsStreamManager';

const Stack = createStackNavigator();

const SectionItem: React.FC<{
  section: (typeof HOME_SECTIONS_ARRAY)[number];
  sectionData: {
    data: unknown[];
    isLoading: boolean;
    refetch: () => void;
  };
  refreshTrigger: number;
}> = ({ section, sectionData, refreshTrigger }) => {
  const handleRefetch = useCallback(() => {
    sectionData.refetch();
  }, [sectionData]);

  return (
    <React.Fragment>
      <SectionHeader sectionId={section.id} />
      <section.Section
        data={sectionData.data}
        isLoading={sectionData.isLoading}
        refetch={handleRefetch}
        refreshTrigger={refreshTrigger}
      />
    </React.Fragment>
  );
};

const TrendingSections: React.FC<{ refreshTrigger: number }> = ({
  refreshTrigger,
}) => {
  const sectionsData = useSectionsData('');

  return HOME_SECTIONS_ARRAY.filter(
    (section) =>
      !sectionsData[section.id].isLoading &&
      sectionsData[section.id].data.length > 0,
  ).map((section) => (
    <SectionItem
      key={section.id}
      section={section}
      sectionData={sectionsData[section.id]}
      refreshTrigger={refreshTrigger}
    />
  ));
};

const TrendingFeed: React.FC = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Update state when returning to TrendingFeed
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateLastTrendingScreen('TrendingFeed');
    });

    return unsubscribe;
  }, [navigation]);

  const portfolioUrl = buildPortfolioUrlWithMetrics(AppConstants.PORTFOLIO.URL);

  const browserTabsCount = useSelector(
    (state: { browser: { tabs: unknown[] } }) => state.browser.tabs.length,
  );
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const handleBrowserPress = useCallback(() => {
    updateLastTrendingScreen('TrendingBrowser');
    navigation.navigate('TrendingBrowser', {
      newTabUrl: portfolioUrl.href,
      timestamp: Date.now(),
      fromTrending: true,
    });
  }, [navigation, portfolioUrl.href]);

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
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <Box style={{ paddingTop: insets.top }} twClassName="flex-1 bg-default">
      <Box twClassName="px-4 py-3">
        <Text variant={TextVariant.HeadingLg} twClassName="text-default">
          {strings('trending.title')}
        </Text>
      </Box>

      <Box twClassName="flex-row items-center gap-2 px-4 pb-3">
        <Box twClassName="flex-1">
          <ExploreSearchBar type="button" onPress={handleSearchPress} />
        </Box>

        <TouchableOpacity onPress={handleBrowserPress}>
          {browserTabsCount > 0 ? (
            <Box
              twClassName="rounded-md items-center justify-center h-8 w-8 border-2"
              style={{
                borderColor: colors.text.default,
              }}
            >
              <Text
                variant={TextVariant.BodyMd}
                testID="trending-view-browser-button"
              >
                {browserTabsCount}
              </Text>
            </Box>
          ) : (
            <Icon
              name={IconName.Explore}
              size={IconSize.Xl}
              testID="trending-view-browser-button"
            />
          )}
        </TouchableOpacity>
      </Box>

      {isBasicFunctionalityEnabled ? (
        <ScrollView
          style={tw.style('flex-1 px-4')}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.icon.default}
              colors={[colors.primary.default]}
            />
          }
        >
          <QuickActions />

          <PerpsConnectionProvider>
            <PerpsStreamProvider>
              <TrendingSections refreshTrigger={refreshTrigger} />
            </PerpsStreamProvider>
          </PerpsConnectionProvider>
        </ScrollView>
      ) : (
        <BasicFunctionalityEmptyState />
      )}
    </Box>
  );
};

const TrendingView: React.FC = () => {
  const initialRoot = lastTrendingScreenRef.current || 'TrendingFeed';

  return (
    <Stack.Navigator
      initialRouteName={initialRoot}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TrendingFeed" component={TrendingFeed} />
      <Stack.Screen
        name={Routes.EXPLORE_SEARCH}
        component={ExploreSearchScreen}
      />
    </Stack.Navigator>
  );
};

export default TrendingView;
