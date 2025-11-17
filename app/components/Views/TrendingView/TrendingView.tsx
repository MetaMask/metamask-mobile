import React, { useCallback, useMemo, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { appendURLParams } from '../../../util/browser';
import { useMetrics } from '../../hooks/useMetrics';
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
  const { isEnabled } = useMetrics();

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
      <Box twClassName="flex-row justify-between items-center px-4 py-3">
        <Text variant={TextVariant.HeadingLg} twClassName="text-default">
          {strings('trending.title')}
        </Text>

        <Box flexDirection={BoxFlexDirection.Row}>
          <ButtonIcon
            iconName={IconName.Explore}
            size={ButtonIconSize.Lg}
            onPress={handleBrowserPress}
            testID="trending-view-browser-button"
          />
        </Box>
      </Box>

      <ExploreSearchBar type="button" onPress={handleSearchPress} />

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
