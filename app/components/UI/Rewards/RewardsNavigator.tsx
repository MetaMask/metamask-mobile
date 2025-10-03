import React, { useCallback, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../constants/navigation/Routes';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './Views/RewardsDashboard';
import ReferralRewardsView from './Views/RewardsReferralView';
import RewardsSettingsView from './Views/RewardsSettingsView';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import ErrorBoundary from '../../Views/ErrorBoundary';
import {
  setOnboardingActiveStep,
  OnboardingStep,
} from '../../../actions/rewards';
import { useDispatch, useSelector } from 'react-redux';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import {
  selectRewardsActiveAccountHasOptedIn,
  selectRewardsSubscriptionId,
} from '../../../selectors/rewards';
import { useCandidateSubscriptionId } from './hooks/useCandidateSubscriptionId';
const Stack = createStackNavigator();

interface RewardsNavigatorProps {
  children?: React.ReactNode;
}

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
  const account = useSelector(selectSelectedInternalAccount);
  const hasAccountedOptedIn = useSelector(selectRewardsActiveAccountHasOptedIn);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const dispatch = useDispatch();

  // Set candidate subscription ID in Redux state when component mounts and account changes
  useCandidateSubscriptionId();

  // Determine initial route - always start with onboarding intro step initially
  const getInitialRoute = () => {
    // If user has already opted in and has a valid subscription candidate ID, go to dashboard
    if (
      hasAccountedOptedIn === true &&
      subscriptionId &&
      subscriptionId !== 'pending' &&
      subscriptionId !== 'error'
    ) {
      return Routes.REWARDS_DASHBOARD;
    }

    // For all other cases, start with onboarding flow (intro step)
    return Routes.REWARDS_ONBOARDING_FLOW;
  };

  useEffect(() => {
    if (account) {
      dispatch(setOnboardingActiveStep(OnboardingStep.INTRO));
    }
  }, [account, dispatch]);

  // Show loading only while checking auth state initially
  if (subscriptionId === 'error') {
    // if we had an error while getting the candidate subscription ID, show the auth error view
    return <AuthErrorView />;
  }

  const isValidSubscriptionCandidateId =
    Boolean(subscriptionId) &&
    subscriptionId !== 'error' &&
    subscriptionId !== 'pending';

  return (
    <Stack.Navigator initialRouteName={getInitialRoute()}>
      <Stack.Screen
        name={Routes.REWARDS_ONBOARDING_FLOW}
        component={OnboardingNavigator}
        options={{ headerShown: false }}
      />
      {hasAccountedOptedIn === true || isValidSubscriptionCandidateId ? (
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
          <Stack.Screen
            name={Routes.REWARDS_SETTINGS_VIEW}
            component={RewardsSettingsView}
            options={{ headerShown: true }}
          />
        </>
      ) : null}
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
