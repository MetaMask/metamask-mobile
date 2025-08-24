import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import Routes from '../../../constants/navigation/Routes';
import { useRewardsAuth } from '../../../core/Engine/controllers/rewards-controller/hooks/useRewardsAuth';
import Logger from '../../../util/Logger';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './RewardsDashboard';
import { selectActiveStep } from '../../../selectors/rewardsOnboarding';

const Stack = createStackNavigator();

interface RewardsNavigatorProps {
  children?: React.ReactNode;
}

const RewardsNavigator: React.FC<RewardsNavigatorProps> = () => {
  const { isOptIn, isLoading, currentAccount, subscription } = useRewardsAuth();

  // Get onboarding state
  const activeStep = useSelector(selectActiveStep);

  // Show loading state or a loading component while checking auth
  if (isLoading) {
    return null;
  }

  Logger.log('RewardsAuthState:', {
    isOptIn,
    currentAccount,
    subscription,
    activeStep,
  });

  // Determine initial route based on auth state and onboarding state
  const getInitialRoute = () => {
    if (isOptIn) {
      return Routes.REWARDS_DASHBOARD;
    }
    return Routes.REWARDS_ONBOARDING_FLOW;
  };

  return (
    <Stack.Navigator initialRouteName={getInitialRoute()}>
      {isOptIn ? (
        <Stack.Screen
          name={Routes.REWARDS_DASHBOARD}
          component={RewardsDashboard}
          options={{ headerShown: false }}
        />
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
