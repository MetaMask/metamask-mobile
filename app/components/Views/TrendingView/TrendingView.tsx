import React, { useCallback, useMemo, useEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
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
import { appendURLParams } from '../../../util/browser';
import { useMetrics } from '../../hooks/useMetrics';
import { useTheme } from '../../../util/theme';
import Browser from '../Browser';
import Routes from '../../../constants/navigation/Routes';
import {
  lastTrendingScreenRef,
  updateLastTrendingScreen,
} from '../../Nav/Main/MainNavigator';
import ExploreSearchScreen from './ExploreSearchScreen/ExploreSearchScreen';
import ExploreSearchBar from './ExploreSearchBar/ExploreSearchBar';
import {
  PredictModalStack,
  PredictMarketDetails,
  PredictSellPreview,
} from '../../UI/Predict';
import PredictBuyPreview from '../../UI/Predict/views/PredictBuyPreview/PredictBuyPreview';
import QuickActions from './components/QuickActions/QuickActions';
import SectionHeader from './components/SectionHeader/SectionHeader';
import { HOME_SECTIONS_ARRAY } from './config/sections.config';

const Stack = createStackNavigator();

// Wrapper component to intercept navigation
const BrowserWrapper: React.FC<{ route: object }> = ({ route }) => {
  const navigation = useNavigation();

  // Create a custom navigation object that intercepts navigate calls
  const customNavigation = useMemo(() => {
    const originalNavigate = navigation.navigate.bind(navigation);

    return {
      ...navigation,
      navigate: (routeName: string, params?: object) => {
        // If trying to navigate to TRENDING_VIEW, go back in stack instead
        if (routeName === Routes.TRENDING_VIEW) {
          navigation.goBack();
        } else {
          originalNavigate(routeName, params);
        }
      },
    };
  }, [navigation]);

  return <Browser navigation={customNavigation} route={route} />;
};

const TrendingFeed: React.FC = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isEnabled } = useMetrics();
  const { colors } = useTheme();

  // Update state when returning to TrendingFeed
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      updateLastTrendingScreen('TrendingFeed');
    });

    return unsubscribe;
  }, [navigation]);

  const isDataCollectionForMarketingEnabled = useSelector(
    (state: { security: { dataCollectionForMarketing?: boolean } }) =>
      state.security.dataCollectionForMarketing,
  );

  const browserTabsCount = useSelector(
    (state: { browser: { tabs: unknown[] } }) => state.browser.tabs.length,
  );

  const portfolioUrl = appendURLParams(AppConstants.PORTFOLIO.URL, {
    metamaskEntry: 'mobile',
    metricsEnabled: isEnabled(),
    marketingEnabled: isDataCollectionForMarketingEnabled ?? false,
  });

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
          <Box
            twClassName="rounded-md items-center justify-center h-8 w-8 border-4"
            style={{
              borderColor: colors.text.default,
            }}
          >
            {browserTabsCount > 0 ? (
              <Text
                variant={TextVariant.BodyMd}
                testID="trending-view-browser-button"
              >
                {browserTabsCount}
              </Text>
            ) : (
              <Icon
                name={IconName.Add}
                size={IconSize.Md}
                testID="trending-view-browser-button"
              />
            )}
          </Box>
        </TouchableOpacity>
      </Box>

      <ScrollView
        style={tw.style('flex-1 px-4')}
        showsVerticalScrollIndicator={false}
      >
        <QuickActions />

        {HOME_SECTIONS_ARRAY.map((section) => (
          <React.Fragment key={section.id}>
            <SectionHeader sectionId={section.id} />
            <section.Section />
          </React.Fragment>
        ))}
      </ScrollView>
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
      <Stack.Screen name="TrendingBrowser" component={BrowserWrapper} />
      <Stack.Screen
        name={Routes.EXPLORE_SEARCH}
        component={ExploreSearchScreen}
      />
      <Stack.Screen
        name={Routes.PREDICT.MODALS.ROOT}
        component={PredictModalStack}
        options={{
          headerShown: false,
          cardStyle: {
            backgroundColor: 'transparent',
          },
          animationEnabled: false,
        }}
      />
      <Stack.Screen
        name={Routes.PREDICT.MARKET_DETAILS}
        component={PredictMarketDetails}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Routes.PREDICT.MODALS.BUY_PREVIEW}
        component={PredictBuyPreview}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Routes.PREDICT.MODALS.SELL_PREVIEW}
        component={PredictSellPreview}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default TrendingView;
