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
import RewardsVipRefereeSplashView from './Views/RewardsVipRefereeSplashView';
import RewardsVipRefereeView from './Views/RewardsVipRefereeView';
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
import PredictThePitchCampaignStatsView from './Views/PredictThePitchCampaignStatsView';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../selectors/rewards';
import { selectIsRewardsVersionBlocked } from '../../../reducers/rewards/selectors';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import useRewardsVersionGuard from './hooks/useRewardsVersionGuard';
import RewardsUpdateRequired from './components/RewardsUpdateRequired/RewardsUpdateRequired';
import { useRewardsNotificationsNudge } from './hooks/useRewardsNotificationsNudge';
import useRewardsToast from './hooks/useRewardsToast';
import { strings } from '../../../../locales/i18n';
import PerpsTradingCampaignWinningView from './Views/PerpsTradingCampaignWinningView';
import { getActiveRouteNameFromNavigationState } from './utils';
import type { RewardsStackParamList } from './types/navigation';

let sessionNotificationsNudgeShown = false;
const Stack = createNativeStackNavigator<RewardsStackParamList>();

const RewardsNavigator: React.FC = () => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVersionBlocked = useSelector(selectIsRewardsVersionBlocked);
  const navigation = useNavigation();

  const activeRewardsRoute = useNavigationState(
    getActiveRouteNameFromNavigationState,
  );

  useRewardsVersionGuard({ refreshKey: activeRewardsRoute });

  // The tab-level data hooks (useCandidateSubscriptionId, useGeoRewardsMetadata,
  // useReferralDetails) intentionally live on RewardsDashboard, not here.
  // RewardsDashboard is the Rewards tab entry and stays mounted while this pushed
  // REWARDS_FLOW stack is open, so it already populates Redux for these sub-pages
  // and keeps event-driven refetches running. Re-declaring those hooks here would
  // duplicate the focus-driven fetches on every entry into the flow.

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

  // Recover from a lost subscription while the flow is mounted.
  //
  // REWARDS_FLOW is a screen on the root MainNavigator stack; it is normally
  // pushed from the dashboard, which only renders for subscribed users. But if
  // the subscription disappears while the flow is still mounted (account switch
  // or opt-out), subscriptionId flips to falsy and the native stack below would
  // be left with zero registered screens — which throws — and its navigation
  // state would still reference sub-page routes that no longer exist (blank flow
  // / broken back). Dismiss the flow so the user returns to the Rewards tab and
  // the stale state is discarded.
  useEffect(() => {
    if (isVersionBlocked || subscriptionId) {
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [isVersionBlocked, subscriptionId, navigation]);

  if (isVersionBlocked) {
    return <RewardsUpdateRequired />;
  }

  // Never render an empty native stack navigator (it throws). When there is no
  // subscription, render nothing while the effect above dismisses the flow.
  if (!subscriptionId) {
    return null;
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
        name={Routes.REWARDS_VIP_REFEREE_SPLASH_VIEW}
        component={RewardsVipRefereeSplashView}
        options={vipScreenOptions}
      />
      <Stack.Screen
        name={Routes.REWARDS_VIP_REFEREE_VIEW}
        component={RewardsVipRefereeView}
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
        name={Routes.REWARDS_PREDICT_THE_PITCH_CAMPAIGN_STATS}
        component={PredictThePitchCampaignStatsView}
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
    </Stack.Navigator>
  );
};

export default RewardsNavigator;
