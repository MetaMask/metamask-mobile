import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import { useRewardsAuth } from './hooks/useRewardsAuth';
import Logger from '../../../util/Logger';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './Views/RewardsDashboard';
import ReferralRewardsView from './Views/RewardsReferralView';
import { useRewardsEngineControllerSync } from './hooks/useRewardsEngineControllerSync';

const Stack = createStackNavigator();

interface RewardsNavigatorProps {
  children?: React.ReactNode;
}

const RewardsNavigator: React.FC<RewardsNavigatorProps> = () => {
  const {
    hasAccountedOptedIntoRewards,
    isLoading,
    currentAccount,
    subscriptionId,
  } = useRewardsAuth();

  // Sync rewards controller state with UI store
  useRewardsEngineControllerSync();

  // Show loading state or a loading component while checking auth
  if (isLoading) {
    return null;
  }

  Logger.log('RewardsAuthState:', {
    hasAccountedOptedIntoRewards,
    currentAccount,
    subscriptionId,
  });

  // Determine initial route based on auth state and onboarding state
  const getInitialRoute = () => {
    if (hasAccountedOptedIntoRewards) {
      return Routes.REWARDS_DASHBOARD;
    }
    return Routes.REWARDS_ONBOARDING_FLOW;
  };

  return (
    <Stack.Navigator initialRouteName={getInitialRoute()}>
      {hasAccountedOptedIntoRewards ? (
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

export default RewardsNavigator;
