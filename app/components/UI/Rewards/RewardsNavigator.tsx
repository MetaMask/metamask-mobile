import React, { useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Routes from '../../../constants/navigation/Routes';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './Views/RewardsDashboard';
import ReferralRewardsView from './Views/RewardsReferralView';
import RewardsSettingsView from './Views/RewardsSettingsView';
import CampaignsView from './Views/CampaignsView';
import OndoCampaignDetailsView from './Views/OndoCampaignDetailsView';
import OndoCampaignWinningScreenView from './Views/OndoCampaignWinningScreenView';
import SeasonOneCampaignDetailsView from './Views/SeasonOneCampaignDetailsView';
import CampaignMechanicsView from './Views/CampaignMechanicsView';
import MusdCalculatorView from './Views/MusdCalculatorView';
import OndoLeaderboardView from './Views/OndoLeaderboardView';
import OndoCampaignRwaSelectorView from './Views/OndoCampaignRwaSelectorView';
import OndoCampaignPortfolioView from './Views/OndoCampaignPortfolioView';
import OndoCampaignStatsView from './Views/OndoCampaignStatsView';
import CampaignTourStepView from './Views/CampaignTourStepView';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import {
  selectIsRewardsVersionBlocked,
  selectPendingDeeplink,
} from '../../../reducers/rewards/selectors';
import { setPendingDeeplink } from '../../../reducers/rewards';
import { useCandidateSubscriptionId } from './hooks/useCandidateSubscriptionId';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import useRewardsVersionGuard from './hooks/useRewardsVersionGuard';
import RewardsUpdateRequired from './components/RewardsUpdateRequired/RewardsUpdateRequired';
import RewardsSubscriber from './RewardsSubscriber';

const Stack = createStackNavigator();

const RewardsNavigator: React.FC = () => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVersionBlocked = useSelector(selectIsRewardsVersionBlocked);
  const pendingDeeplink = useSelector(selectPendingDeeplink);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();
  // Guards against the spurious re-fire that dispatch(setPendingDeeplink(null))
  // triggers. After a deeplink is handled, clearing the Redux state changes
  // pendingDeeplink from a value to null; that dep change causes this effect to
  // re-run and would otherwise fall through to navigate(REWARDS_DASHBOARD),
  // overriding the deeplink destination. The ref skips exactly that one follow-up fire.
  // Clearing via Redux (instead of route.params / setParams) is necessary because
  // RewardsHome is UnmountOnBlur — the navigator is not mounted when the user is
  // on another tab, so navigation params would be lost; Redux state is always
  // available regardless of mount status.
  const skipNextEffectRef = useRef(false);

  useRewardsVersionGuard();

  // Set candidate subscription ID in Redux state when component mounts and account changes
  useCandidateSubscriptionId();

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
      if (skipNextEffectRef.current) {
        skipNextEffectRef.current = false;
        return;
      }
      if (pendingDeeplink?.page === 'campaigns') {
        navigation.navigate(Routes.REWARDS_CAMPAIGNS_VIEW);
      } else if (pendingDeeplink?.campaign === 'ondo') {
        navigation.navigate(Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW);
      } else if (pendingDeeplink?.campaign === 'season1') {
        navigation.navigate(Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW);
      } else if (pendingDeeplink?.page === 'musd') {
        navigation.navigate(Routes.REWARDS_MUSD_CALCULATOR_VIEW);
      } else if (pendingDeeplink?.page === 'benefits') {
        navigation.navigate(Routes.REWARD_BENEFITS_FULL_VIEW);
      } else {
        navigation.navigate(Routes.REWARDS_DASHBOARD);
      }
      if (pendingDeeplink?.page || pendingDeeplink?.campaign) {
        skipNextEffectRef.current = true;
        dispatch(setPendingDeeplink(null));
      }
    } else {
      navigation.navigate(Routes.REWARDS_ONBOARDING_FLOW);
    }
  }, [navigation, dispatch, subscriptionId, isVersionBlocked, pendingDeeplink]);

  if (isVersionBlocked) {
    return <RewardsUpdateRequired />;
  }

  return (
    <>
      <RewardsSubscriber />
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
              name={Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW}
              component={OndoCampaignWinningScreenView}
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
    </>
  );
};

export default RewardsNavigator;
