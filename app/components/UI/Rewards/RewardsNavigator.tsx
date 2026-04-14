import React, { useEffect, useRef } from 'react';
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
import CampaignTourStepView from './Views/CampaignTourStepView';
import BenefitsView from './Views/BenefitsView';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import { selectIsRewardsVersionBlocked } from '../../../reducers/rewards/selectors';
import { useCandidateSubscriptionId } from './hooks/useCandidateSubscriptionId';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const route = useRoute();
  const deepLinkPage = (route.params as { page?: string } | undefined)?.page;
  const deepLinkCampaign = (route.params as { campaign?: string } | undefined)
    ?.campaign;
  const { colors } = useTheme();
  // Tracks that the effect fired because setParams just cleared the deeplink
  // params. The next fire (params → undefined) must be skipped to prevent the
  // else-branch from navigating to REWARDS_DASHBOARD and overriding the
  // intended deeplink destination.
  const skipNextEffectRef = useRef(false);

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
      // Skip this fire: it was triggered by setParams clearing the deeplink
      // params. Without the guard the else-branch below would immediately
      // navigate to REWARDS_DASHBOARD, overriding the deeplink destination.
      if (skipNextEffectRef.current) {
        skipNextEffectRef.current = false;
        return;
      }
      if (deepLinkPage === 'campaigns') {
        navigation.navigate(Routes.REWARDS_CAMPAIGNS_VIEW);
      } else if (deepLinkCampaign === 'ondo') {
        navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW);
      } else if (deepLinkCampaign === 'season1') {
        navigation.navigate(Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW);
      } else if (deepLinkPage === 'musd') {
        navigation.navigate(Routes.REWARDS_MUSD_CALCULATOR_VIEW);
      } else if (deepLinkPage === 'benefits') {
        navigation.navigate(Routes.REWARDS_BENEFITS_VIEW);
      } else {
        navigation.navigate(Routes.REWARDS_DASHBOARD);
      }
      // Consume deeplink params after first use. setParams will re-fire this
      // effect with both values as undefined; skipNextEffectRef prevents that
      // from landing on REWARDS_DASHBOARD.
      if (deepLinkPage || deepLinkCampaign) {
        skipNextEffectRef.current = true;
        navigation.setParams({ page: undefined, campaign: undefined });
      }
    } else {
      navigation.navigate(Routes.REWARDS_ONBOARDING_FLOW);
    }
  }, [
    navigation,
    subscriptionId,
    isVersionBlocked,
    deepLinkPage,
    deepLinkCampaign,
  ]);

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
            name={Routes.REWARDS_CAMPAIGN_TOUR_STEP}
            component={CampaignTourStepView}
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
          <Stack.Screen
            name={Routes.REWARDS_BENEFITS_VIEW}
            component={BenefitsView}
            options={{ headerShown: false }}
          />
        </>
      ) : null}
    </Stack.Navigator>
  );
};

export default RewardsNavigator;
