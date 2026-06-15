import React, { useCallback, useEffect } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectHasAcceptedVipRefereeInvite,
  selectIsVipReferee,
  selectReferredByVipCode,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import VipRefereeSplashScreen from '../components/Vip/VipRefereeSplashScreen';

const RewardsVipRefereeSplashViewContent: React.FC = () => {
  const navigation = useNavigation();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isVipProgramEnabled = useSelector(selectVipProgramEnabled);
  const isVipReferee = useSelector(selectIsVipReferee);
  const referredByVipCode = useSelector(selectReferredByVipCode);
  const hasAcceptedVipRefereeInvite = useSelector(
    selectHasAcceptedVipRefereeInvite(subscriptionId),
  );
  const canViewReferee = Boolean(
    subscriptionId && isVipProgramEnabled && isVipReferee,
  );

  useEffect(() => {
    if (!canViewReferee) {
      navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
      return;
    }

    if (hasAcceptedVipRefereeInvite) {
      navigation.dispatch(
        StackActions.replace(Routes.REWARDS_VIP_REFEREE_VIEW),
      );
    }
  }, [canViewReferee, hasAcceptedVipRefereeInvite, navigation]);

  const handleContinue = useCallback(() => {
    if (!subscriptionId) {
      return;
    }

    // The referee page persists the seen-flag on mount (mirrors the VIP splash
    // → VIP view pattern), so a back/cancel from here never persists.
    navigation.dispatch(StackActions.replace(Routes.REWARDS_VIP_REFEREE_VIEW));
  }, [navigation, subscriptionId]);

  const handleNotNow = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.dispatch(StackActions.replace(Routes.REWARDS_DASHBOARD));
  }, [navigation]);

  if (!canViewReferee || hasAcceptedVipRefereeInvite) {
    return null;
  }

  return (
    <VipRefereeSplashScreen
      onContinue={handleContinue}
      onNotNow={handleNotNow}
      referredByCode={referredByVipCode}
    />
  );
};

const RewardsVipRefereeSplashView: React.FC = () => {
  const navigation = useNavigation();

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipRefereeSplashView">
      <RewardsVipRefereeSplashViewContent />
    </ErrorBoundary>
  );
};

export default RewardsVipRefereeSplashView;
