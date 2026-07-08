import React, { useCallback, useEffect } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectHasAcceptedVipInvite } from '../../../../reducers/rewards/selectors';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import VipSplashScreenLayout, {
  VIP_SPLASH_SCREEN_TEST_IDS,
} from '../components/Vip/VipSplashScreenLayout';
import { useVipDashboard } from '../hooks/useVipDashboard';

const RewardsVipSplashViewContent: React.FC = () => {
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const isVipEnabled = useSelector(selectIsCurrentSubscriptionVipEnabled);
  const hasAcceptedVipInvite = useSelector(
    selectHasAcceptedVipInvite(subscriptionId),
  );
  const canViewVip = Boolean(
    isVipProgramEnabled && subscriptionId && isVipEnabled,
  );

  useVipDashboard();

  useEffect(() => {
    if (!canViewVip) {
      navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
      return;
    }

    if (hasAcceptedVipInvite) {
      navigation.dispatch(StackActions.replace(Routes.REWARDS_VIP_VIEW));
    }
  }, [canViewVip, hasAcceptedVipInvite, navigation]);

  const handleAcceptInvite = useCallback(() => {
    if (!subscriptionId) {
      return;
    }

    navigation.dispatch(StackActions.replace(Routes.REWARDS_VIP_VIEW));
  }, [navigation, subscriptionId]);

  const handleNotNow = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
  }, [navigation]);

  if (!canViewVip || hasAcceptedVipInvite) {
    return null;
  }

  return (
    <VipSplashScreenLayout
      testIDs={{
        container: VIP_SPLASH_SCREEN_TEST_IDS.CONTAINER,
        title: VIP_SPLASH_SCREEN_TEST_IDS.TITLE,
        description: VIP_SPLASH_SCREEN_TEST_IDS.DESCRIPTION,
        fox: VIP_SPLASH_SCREEN_TEST_IDS.FOX,
        primaryButton: VIP_SPLASH_SCREEN_TEST_IDS.ACCEPT_BUTTON,
        notNowButton: VIP_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON,
      }}
      onPrimaryPress={handleAcceptInvite}
      onNotNow={handleNotNow}
      primaryButtonLabel={strings('rewards.vip.splash_accept_invite')}
    />
  );
};

const RewardsVipSplashView: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipSplashView">
      <RewardsVipSplashViewContent />
    </ErrorBoundary>
  );
};

export default RewardsVipSplashView;
