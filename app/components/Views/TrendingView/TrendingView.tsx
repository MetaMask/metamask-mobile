import React, { useCallback, useMemo, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { appendURLParams } from '../../../util/browser';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Browser from '../Browser';
import Routes from '../../../constants/navigation/Routes';
import {
  lastTrendingScreenRef,
  updateLastTrendingScreen,
} from '../../Nav/Main/MainNavigator';

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

  return (
    <Box style={{ paddingTop: insets.top }} twClassName="flex-1 bg-default">
      <Box twClassName="flex-row justify-between items-center px-4 py-3 bg-default border-b border-muted">
        <Text variant={TextVariant.HeadingMd} twClassName="text-default">
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

      <Box
        twClassName="flex-1 bg-default px-5"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-muted text-center"
          testID="trending-view-coming-soon"
        >
          {strings('trending.coming_soon')}
        </Text>
      </Box>
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
    </Stack.Navigator>
  );
};

export default TrendingView;
