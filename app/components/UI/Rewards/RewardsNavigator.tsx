import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './Views/RewardsDashboard';
import ReferralRewardsView from './Views/RewardsReferralView';
import RewardsSettingsView from './Views/RewardsSettingsView';
import CampaignsView from './Views/CampaignsView';
import OndoCampaignDetailsView from './Views/OndoCampaignDetailsView';
import SeasonOneCampaignDetailsView from './Views/SeasonOneCampaignDetailsView';
import CampaignMechanicsView from './Views/CampaignMechanicsView';
import MusdCalculatorView from './Views/MusdCalculatorView';
import OndoLeaderboardView from './Views/OndoLeaderboardView';
import OndoCampaignRwaSelectorView from './Views/OndoCampaignRwaSelectorView';
import OndoCampaignPortfolioView from './Views/OndoCampaignPortfolioView';
import OndoCampaignStatsView from './Views/OndoCampaignStatsView';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import { selectIsRewardsVersionBlocked } from '../../../reducers/rewards/selectors';
import { useCandidateSubscriptionId } from './hooks/useCandidateSubscriptionId';
import { useNavigation } from '@react-navigation/native';
import { useSeasonStatus } from './hooks/useSeasonStatus';
import { useTheme } from '../../../util/theme';
import { useGeoRewardsMetadata } from './hooks/useGeoRewardsMetadata';
import useRewardsVersionGuard from './hooks/useRewardsVersionGuard';
import { useReferralDetails } from './hooks/useReferralDetails';
import RewardsUpdateRequired from './components/RewardsUpdateRequired/RewardsUpdateRequired';
const Stack = createStackNavigator();

const RewardsNavigator: React.FC = () => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVersionBlocked = useSelector(selectIsRewardsVersionBlocked);
  const navigation = useNavigation();
  const { colors } = useTheme();

  useRewardsVersionGuard();

  // Set candidate subscription ID in Redux state when component mounts and account changes
  useCandidateSubscriptionId();

  // This is used to fetch season status data when the component mounts
  useSeasonStatus({ onlyForExplicitFetch: false });

  // Fetch geo rewards metadata so optinAllowedForGeo is available across all rewards screens
  useGeoRewardsMetadata({});

  // Fetch referral details so referral code is available across all rewards screens
  useReferralDetails();

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
    if (isVersionBlocked) {
      return;
    }
    if (subscriptionId) {
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    } else {
      navigation.navigate(Routes.REWARDS_ONBOARDING_FLOW);
    }
  }, [navigation, subscriptionId, isVersionBlocked]);

  if (isVersionBlocked) {
    return <RewardsUpdateRequired />;
  }

  return (
    <Stack.Navigator initialRouteName={getInitialRoute()}>
      <Stack.Screen
        name={Routes.REWARDS_ONBOARDING_FLOW}
        component={OnboardingNavigator}
        options={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background.default },
        }}
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
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_SETTINGS_VIEW}
            component={RewardsSettingsView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_CAMPAIGNS_VIEW}
            component={CampaignsView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW}
            component={OndoCampaignDetailsView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW}
            component={SeasonOneCampaignDetailsView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_CAMPAIGN_MECHANICS}
            component={CampaignMechanicsView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_MUSD_CALCULATOR_VIEW}
            component={MusdCalculatorView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD}
            component={OndoLeaderboardView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR}
            component={OndoCampaignRwaSelectorView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_PORTFOLIO_VIEW}
            component={OndoCampaignPortfolioView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_STATS}
            component={OndoCampaignStatsView}
            options={{ headerShown: false }}
          />
        </>
      ) : null}
    </Stack.Navigator>
  );
};

export default RewardsNavigator;
