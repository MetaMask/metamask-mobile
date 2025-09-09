import React, { useCallback, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../constants/navigation/Routes';
import { useRewardsAuth } from './hooks/useRewardsAuth';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './Views/RewardsDashboard';
import ReferralRewardsView from './Views/RewardsReferralView';
import Skeleton from '../../../component-library/components/Skeleton/Skeleton';
import { Box } from '@metamask/design-system-react-native';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import ErrorBoundary from '../../Views/ErrorBoundary';
import { useTheme } from '../../../util/theme';
import { getNavigationOptionsTitle } from '../Navbar';
import {
  setOnboardingActiveStep,
  OnboardingStep,
} from '../../../actions/rewards';
import { useDispatch, useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';

const Stack = createStackNavigator();

interface RewardsNavigatorProps {
  children?: React.ReactNode;
}

const LoadingView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  // Set navigation title
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('rewards.main_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation]);
  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <SafeAreaView
        style={tw.style('flex-1 bg-default')}
        edges={['top', 'left', 'right']}
      >
        <Box twClassName="flex-1 items-center justify-center">
          <Skeleton width="100%" height="100%" />
        </Box>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const AuthErrorView = () => {
  const tw = useTailwind();
  const navigation = useNavigation();

  const handleGoToWallet = useCallback(() => {
    // Navigate to the main wallet overview
    navigation.navigate('Home', { screen: Routes.WALLET.HOME });
  }, [navigation]);

  return (
    <ErrorBoundary navigation={navigation} view="RewardsView">
      <SafeAreaView
        style={tw.style('flex-1 bg-default p-4')}
        edges={['top', 'left', 'right']}
      >
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          title={strings('rewards.auth_fail_title')}
          description={strings('rewards.auth_fail_description')}
          actionButtonProps={{
            variant: ButtonVariants.Link,
            label: strings('navigation.back'),
            onPress: handleGoToWallet,
          }}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const RewardsNavigatorContent: React.FC = () => {
  const { hasAccountedOptedIn } = useRewardsAuth();
  const account = useSelector(selectSelectedInternalAccount);
  const dispatch = useDispatch();

  // Determine initial route based on auth state and onboarding state
  const getInitialRoute = () => {
    if (hasAccountedOptedIn === true) {
      return Routes.REWARDS_DASHBOARD;
    }
    return Routes.REWARDS_ONBOARDING_FLOW;
  };

  useEffect(() => {
    if (account) {
      dispatch(setOnboardingActiveStep(OnboardingStep.INTRO));
    }
  }, [account, dispatch]);

  if (hasAccountedOptedIn === 'pending') {
    return <LoadingView />;
  }
  if (hasAccountedOptedIn === 'error') {
    return <AuthErrorView />;
  }

  return (
    <Stack.Navigator initialRouteName={getInitialRoute()}>
      {hasAccountedOptedIn === true ? (
        <>
          <Stack.Screen
            name={Routes.REWARDS_DASHBOARD}
            component={RewardsDashboard}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REFERRAL_REWARDS_VIEW}
            component={ReferralRewardsView}
            options={{ headerShown: true }}
          />
        </>
      ) : (
        <Stack.Screen
          name={Routes.REWARDS_ONBOARDING_FLOW}
          component={OnboardingNavigator}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
};

const RewardsNavigator: React.FC<RewardsNavigatorProps> = () => {
  const isFocused = useIsFocused();

  // Return early loading state when not focused to avoid running expensive hooks
  if (!isFocused) {
    return <></>;
  }

  return <RewardsNavigatorContent />;
};

export default RewardsNavigator;
