import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { darkTheme } from '@metamask/design-tokens';
import Routes from '../../../constants/navigation/Routes';
import { slideFromRightNativeOptions } from '../../../constants/navigation/clearStackNavigatorOptions';
import OnboardingNavigator from './OnboardingNavigator';
import RewardsDashboard from './Views/RewardsDashboard';
import ReferralRewardsView from './Views/RewardsReferralView';
import RewardsSettingsView from './Views/RewardsSettingsView';
import RewardsVipSplashView from './Views/RewardsVipSplashView';
import RewardsVipView from './Views/RewardsVipView';
import RewardsVipTiersView from './Views/RewardsVipTiersView';
import CampaignsView from './Views/CampaignsView';
import OndoCampaignDetailsView from './Views/OndoCampaignDetailsView';
import OndoCampaignWinningView from './Views/OndoCampaignWinningView';
import SeasonOneCampaignDetailsView from './Views/SeasonOneCampaignDetailsView';
import CampaignMechanicsView from './Views/CampaignMechanicsView';
import MusdCalculatorView from './Views/MusdCalculatorView';
import OndoLeaderboardView from './Views/OndoLeaderboardView';
import OndoCampaignRwaSelectorView from './Views/OndoCampaignRwaSelectorView';
import OndoCampaignPortfolioView from './Views/OndoCampaignPortfolioView';
import OndoCampaignStatsView from './Views/OndoCampaignStatsView';
import CampaignTourStepView from './Views/CampaignTourStepView';
import PerpsTradingCampaignDetailsView from './Views/PerpsTradingCampaignDetailsView';
import PerpsTradingCampaignLeaderboardView from './Views/PerpsTradingCampaignLeaderboardView';
import PerpsTradingCampaignStatsView from './Views/PerpsTradingCampaignStatsView';
import PredictThePitchCampaignDetailsView from './Views/PredictThePitchCampaignDetailsView';
import PredictThePitchCampaignWinningView from './Views/PredictThePitchCampaignWinningView';
import PredictThePitchCampaignLeaderboardView from './Views/PredictThePitchCampaignLeaderboardView';
import PredictThePitchCampaignPortfolioView from './Views/PredictThePitchCampaignPortfolioView';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import { selectIsRewardsVersionBlocked } from '../../../reducers/rewards/selectors';
import { useCandidateSubscriptionId } from './hooks/useCandidateSubscriptionId';
import { useNavigationState } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import useRewardsVersionGuard from './hooks/useRewardsVersionGuard';
import RewardsUpdateRequired from './components/RewardsUpdateRequired/RewardsUpdateRequired';
import { useGeoRewardsMetadata } from './hooks/useGeoRewardsMetadata';
import { useReferralDetails } from './hooks/useReferralDetails';
import { useRewardsNotificationsNudge } from './hooks/useRewardsNotificationsNudge';
import useRewardsToast from './hooks/useRewardsToast';
import { strings } from '../../../../locales/i18n';
import PerpsTradingCampaignWinningView from './Views/PerpsTradingCampaignWinningView';
import { getActiveRouteNameFromNavigationState } from './utils';

let sessionNotificationsNudgeShown = false;
const Stack = createNativeStackNavigator();

const RewardsNavigator: React.FC = () => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVersionBlocked = useSelector(selectIsRewardsVersionBlocked);
  const { colors } = useTheme();

  const activeRewardsRoute = useNavigationState(
    getActiveRouteNameFromNavigationState,
  );

  useRewardsVersionGuard({ refreshKey: activeRewardsRoute });

  // Set candidate subscription ID in Redux state when component mounts and account changes
  useCandidateSubscriptionId();

  // Fetch geo rewards metadata so optinAllowedForGeo is available across all rewards screens
  useGeoRewardsMetadata({});

  // Fetch referral details so referral code is available across all rewards screens
  useReferralDetails();

  const { showToast, RewardsToastOptions } = useRewardsToast();

  const nudgeToastActiveRef = useRef(false);

  const {
    areNotificationsEnabled,
    canPromptToEnableNotifications,
    showEnableNotificationsNudge,
    closeEnableNotificationsNudge,
  } = useRewardsNotificationsNudge({
    onNotificationsEnabled: () => {
      showToast(
        RewardsToastOptions.success(
          strings('rewards.notifications_nudge.success'),
        ),
      );
    },
  });

  useEffect(() => {
    if (!canPromptToEnableNotifications) {
      return;
    }
    if (areNotificationsEnabled) {
      return;
    }

    const isOnCampaignRoute =
      activeRewardsRoute === Routes.REWARDS_CAMPAIGNS_VIEW ||
      activeRewardsRoute === Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW ||
      activeRewardsRoute === Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW ||
      activeRewardsRoute ===
        Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW ||
      activeRewardsRoute ===
        Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW;

    if (!isOnCampaignRoute) {
      // Explicitly close the nudge when navigating away — don't rely solely on
      // the effect cleanup, which can miss fires when the nested navigator state
      // change doesn't propagate up to useNavigationState in time.
      if (nudgeToastActiveRef.current) {
        nudgeToastActiveRef.current = false;
        closeEnableNotificationsNudge();
      }
      return;
    }

    if (sessionNotificationsNudgeShown) {
      return;
    }

    const didShowNudge = showEnableNotificationsNudge();
    if (!didShowNudge) {
      return;
    }
    sessionNotificationsNudgeShown = true;
    nudgeToastActiveRef.current = true;

    return () => {
      if (nudgeToastActiveRef.current) {
        nudgeToastActiveRef.current = false;
        closeEnableNotificationsNudge();
      }
    };
  }, [
    activeRewardsRoute,
    areNotificationsEnabled,
    canPromptToEnableNotifications,
    closeEnableNotificationsNudge,
    showEnableNotificationsNudge,
  ]);

  if (isVersionBlocked) {
    return <RewardsUpdateRequired />;
  }

  const vipScreenOptions = {
    headerShown: false,
    ...slideFromRightNativeOptions,
    contentStyle: {
      backgroundColor: darkTheme.colors.background.default,
    },
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {subscriptionId ? (
        <>
          <Stack.Screen
            name={Routes.REFERRAL_REWARDS_VIEW}
            component={ReferralRewardsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_SETTINGS_VIEW}
            component={RewardsSettingsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_VIP_SPLASH_VIEW}
            component={RewardsVipSplashView}
            options={vipScreenOptions}
          />
          <Stack.Screen
            name={Routes.REWARDS_VIP_VIEW}
            component={RewardsVipView}
            options={vipScreenOptions}
          />
          <Stack.Screen
            name={Routes.REWARDS_VIP_TIERS_VIEW}
            component={RewardsVipTiersView}
            options={vipScreenOptions}
          />
          <Stack.Screen
            name={Routes.REWARDS_CAMPAIGNS_VIEW}
            component={CampaignsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_CAMPAIGN_TOUR_STEP}
            component={CampaignTourStepView}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_DETAILS_VIEW}
            component={OndoCampaignDetailsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_WINNING_VIEW}
            component={OndoCampaignWinningView}
          />
          <Stack.Screen
            name={Routes.REWARDS_SEASON_ONE_CAMPAIGN_DETAILS_VIEW}
            component={SeasonOneCampaignDetailsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_CAMPAIGN_MECHANICS}
            component={CampaignMechanicsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_MUSD_CALCULATOR_VIEW}
            component={MusdCalculatorView}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_LEADERBOARD}
            component={OndoLeaderboardView}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_RWA_ASSET_SELECTOR}
            component={OndoCampaignRwaSelectorView}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_PORTFOLIO_VIEW}
            component={OndoCampaignPortfolioView}
          />
          <Stack.Screen
            name={Routes.REWARDS_ONDO_CAMPAIGN_STATS}
            component={OndoCampaignStatsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_PERPS_TRADING_CAMPAIGN_DETAILS_VIEW}
            component={PerpsTradingCampaignDetailsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_PERPS_TRADING_CAMPAIGN_LEADERBOARD}
            component={PerpsTradingCampaignLeaderboardView}
          />
          <Stack.Screen
            name={Routes.REWARDS_PERPS_TRADING_CAMPAIGN_STATS}
            component={PerpsTradingCampaignStatsView}
          />
          <Stack.Screen
            name={Routes.REWARDS_PERPS_TRADING_CAMPAIGN_WINNING_VIEW}
            component={PerpsTradingCampaignWinningView}
          />
          <Stack.Screen
            name={Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_DETAILS_VIEW}
            component={PredictThePitchCampaignDetailsView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_LEADERBOARD}
            component={PredictThePitchCampaignLeaderboardView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_PORTFOLIO_VIEW}
            component={PredictThePitchCampaignPortfolioView}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name={Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_WINNING_VIEW}
            component={PredictThePitchCampaignWinningView}
            options={{ headerShown: false }}
          />
        </>
      ) : null}
    </Stack.Navigator>
  );
};

export default RewardsNavigator;
