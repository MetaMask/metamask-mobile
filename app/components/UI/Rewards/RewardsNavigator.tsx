import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './Views/RewardsDashboard';
import ReferralRewardsView from './Views/RewardsReferralView';
import RewardsSettingsView from './Views/RewardsSettingsView';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import { useCandidateSubscriptionId } from './hooks/useCandidateSubscriptionId';
import { useNavigation } from '@react-navigation/native';
import { useSeasonStatus } from './hooks/useSeasonStatus';
import { useTheme } from '../../../util/theme';
import { colors as importedColors } from '../../../styles/common';
const Stack = createStackNavigator();

const RewardsNavigator: React.FC = () => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Set candidate subscription ID in Redux state when component mounts and account changes
  useCandidateSubscriptionId();

  // This is used to fetch season status data when the component mounts
  useSeasonStatus({ onlyForExplicitFetch: false });

  // Determine initial route - always start with onboarding intro step initially
  const getInitialRoute = () => {
    // If user has already opted in and has a valid subscription candidate ID, go to dashboard
    if (subscriptionId) {
      return Routes.REWARDS_DASHBOARD;
    }

    // For all other cases, start with onboarding flow (intro step)
    return Routes.REWARDS_ONBOARDING_FLOW;
  };

  useEffect(() => {
    if (subscriptionId) {
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    } else {
      navigation.navigate(Routes.REWARDS_ONBOARDING_FLOW);
    }
  }, [navigation, subscriptionId]);

  return (
    <Stack.Navigator
      initialRouteName={getInitialRoute()}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.default,
          shadowColor: importedColors.transparent,
          elevation: 0,
        },
        cardStyle: { backgroundColor: colors.background.default },
        headerTintColor: colors.primary.default,
        headerTitleStyle: {
          color: colors.text.default,
        },
      }}
    >
      <Stack.Screen
        name={Routes.REWARDS_ONBOARDING_FLOW}
        component={OnboardingNavigator}
        options={{ headerShown: false }}
      />
      {subscriptionId ? (
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

export default RewardsNavigator;
