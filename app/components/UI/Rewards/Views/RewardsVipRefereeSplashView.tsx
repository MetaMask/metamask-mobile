import React, { useCallback, useEffect } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useSelector } from 'react-redux';
import {
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../constants/navigation/Routes';
import { exitRewardsFlow } from '../utils';
import {
  selectHasAcceptedVipRefereeInvite,
  selectIsVipReferee,
  selectReferredByVipCode,
} from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectVipProgramEnabled } from '../../../../selectors/featureFlagController/vipProgram';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { VIP_GOLD_TEXT_MUTED } from '../components/Vip/Vip.constants';
import VipSplashScreenLayout, {
  VIP_REFEREE_SPLASH_SCREEN_TEST_IDS,
} from '../components/Vip/VipSplashScreenLayout';

const RewardsVipRefereeSplashViewContent: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
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
      exitRewardsFlow(navigation);
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
    exitRewardsFlow(navigation);
  }, [navigation]);

  if (!canViewReferee || hasAcceptedVipRefereeInvite) {
    return null;
  }

  return (
    <VipSplashScreenLayout
      testIDs={{
        container: VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTAINER,
        title: VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.TITLE,
        description: VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.DESCRIPTION,
        fox: VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.FOX,
        primaryButton: VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.CONTINUE_BUTTON,
        notNowButton: VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.NOT_NOW_BUTTON,
      }}
      onPrimaryPress={handleContinue}
      onNotNow={handleNotNow}
      primaryButtonLabel={strings('rewards.vip.referee_splash_continue')}
      footerContent={
        referredByVipCode ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            style={tw.style('text-center', { color: VIP_GOLD_TEXT_MUTED })}
            testID={VIP_REFEREE_SPLASH_SCREEN_TEST_IDS.REFERRED_BY}
          >
            {strings('rewards.vip.referee_referred_by', {
              code: referredByVipCode,
            })}
          </Text>
        ) : null
      }
    />
  );
};

const RewardsVipRefereeSplashView: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();

  return (
    <ErrorBoundary navigation={navigation} view="RewardsVipRefereeSplashView">
      <RewardsVipRefereeSplashViewContent />
    </ErrorBoundary>
  );
};

export default RewardsVipRefereeSplashView;
