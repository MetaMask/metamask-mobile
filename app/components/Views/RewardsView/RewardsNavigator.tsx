import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import RewardsDashboard from './RewardsDashboard';
import RewardsTerms from './RewardsTerms';
import Routes from '../../../constants/navigation/Routes';
import { useRewards } from '../../../core/Engine/controllers/rewards-controller/RewardsAuthProvider';
import RewardsView from '.';
import Logger from '../../../util/Logger';

const Stack = createStackNavigator();

interface RewardsNavigatorProps {
  children?: React.ReactNode;
}

const RewardsNavigator: React.FC<RewardsNavigatorProps> = () => {
  const {
    isOptIn,
    isLoading,
    optinError,
    clearOptinError,
    currentAccount,
    subscriptionId,
  } = useRewards();
  const navigation = useNavigation();

  const handleOptIn = () => {
    navigation.navigate(Routes.REWARDS_TERMS);
  };

  // Show loading state or a loading component while checking auth
  if (isLoading) {
    return null;
  }

  Logger.log('RewardsAuthState:', {
    isOptIn,
    currentAccount,
    subscriptionId,
  });

  return (
    <Stack.Navigator>
      {isOptIn ? (
        <Stack.Screen
          name={Routes.REWARDS_DASHBOARD}
          component={RewardsDashboard}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name={Routes.REWARDS_VIEW}
            options={{ headerShown: false }}
          >
            {(props) => (
              <RewardsView
                {...props}
                onOptIn={handleOptIn}
                optinError={optinError}
                onClearError={clearOptinError}
                isLoading={isLoading}
              />
            )}
          </Stack.Screen>
          <Stack.Screen
            name={Routes.REWARDS_TERMS}
            component={RewardsTerms}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RewardsNavigator;
