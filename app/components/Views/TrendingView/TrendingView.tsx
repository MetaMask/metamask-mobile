import React, { useCallback, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { useBuildPortfolioUrl } from '../../hooks/useBuildPortfolioUrl';
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
  PredictScreenStack,
  PredictModalStack,
  PredictMarketDetails,
  PredictSellPreview,
} from '../../UI/Predict';
import PredictBuyPreview from '../../UI/Predict/views/PredictBuyPreview/PredictBuyPreview';
import QuickActions from './components/QuickActions/QuickActions';
import SectionHeader from './components/SectionHeader/SectionHeader';
import { HOME_SECTIONS_ARRAY } from './config/sections.config';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';

const Stack = createStackNavigator();

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    paddingLeft: 16,
    paddingRight: 16,
  },
});

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
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const buildPortfolioUrlWithMetrics = useBuildPortfolioUrl();
  const { colors } = useTheme();

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

      <Box twClassName="px-4 pb-3">
        <Box twClassName="flex-row items-center gap-2">
          <Box twClassName="flex-1">
            <ExploreSearchBar type="button" onPress={handleSearchPress} />
          </Box>

          <Box
            twClassName="rounded-md items-center justify-center h-8 w-8 border-4"
            style={{
              borderColor: colors.text.default,
            }}
          >
            {browserTabsCount > 0 ? (
              <ButtonLink
                onPress={handleBrowserPress}
                label={browserTabsCount}
                testID="trending-view-browser-button"
              />
            ) : (
              <ButtonIcon
                iconName={IconName.Add}
                size={ButtonIconSize.Md}
                onPress={handleBrowserPress}
                testID="trending-view-browser-button"
              />
            )}
          </Box>
        </Box>
      </Box>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <QuickActions />

        {HOME_SECTIONS_ARRAY.map((section) => (
          <React.Fragment key={section.id}>
            <SectionHeader sectionId={section.id} />
            {section.renderSection()}
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
        name={Routes.PREDICT.ROOT}
        component={PredictScreenStack}
        options={{
          headerShown: false,
          cardStyle: {
            backgroundColor: 'transparent',
          },
          animationEnabled: false,
        }}
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
