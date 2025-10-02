import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectRewardsAnnouncementModalEnabledFlag,
  selectRewardsEnabledFlag,
} from '../../../../selectors/featureFlagController/rewards';
import { selectMultichainAccountsIntroModalSeen } from '../../../../reducers/user';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  LAST_APP_VERSION,
  REWARDS_GTM_MODAL_SHOWN,
} from '../../../../constants/storage';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { setOnboardingActiveStep } from '../../../../reducers/rewards';
import { OnboardingStep } from '../../../../reducers/rewards/types';
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';

const isE2ETest =
  process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e';

/**
 * Hook to handle showing the rewards GTM intro modal
 * Shows the modal only when:
 * 1. Rewards feature flag is enabled
 * 2. Rewards announcement feature flag is enabled
 * 3. The modal hasn't been seen before
 * 4. The MultichainAccountsIntroModal has shown
 * 5. User does not have an active subscription
 */

export const useRewardsIntroModal = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const isRewardsFeatureEnabled = useSelector(selectRewardsEnabledFlag);
  const isRewardsAnnouncementEnabled = useSelector(
    selectRewardsAnnouncementModalEnabledFlag,
  );
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  const hasSeenBIP44IntroModal = useSelector(
    selectMultichainAccountsIntroModalSeen,
  );

  const [hasSeenRewardsIntroModal, setHasSeenRewardsIntroModal] =
    useState(true);

  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  const checkAndShowRewardsIntroModal = useCallback(async () => {
    // Check if this is a fresh install
    const lastAppVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
    const isFreshInstall = !lastAppVersion;

    const shouldShow =
      isRewardsFeatureEnabled &&
      isRewardsAnnouncementEnabled &&
      // BIP44 intro modal has been seen or it's a fresh install (which doesnt trigger bip44 modal) or bip44 is not enabled
      (!isMultichainAccountsState2Enabled ||
        hasSeenBIP44IntroModal ||
        isFreshInstall) &&
      !hasSeenRewardsIntroModal &&
      !subscriptionId;

    if (shouldShow && !isE2ETest) {
      dispatch(setOnboardingActiveStep(OnboardingStep.INTRO_MODAL));
      navigation.navigate(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_ONBOARDING_FLOW,
        params: { screen: Routes.MODAL.REWARDS_INTRO_MODAL },
      });
    }
  }, [
    isRewardsFeatureEnabled,
    isMultichainAccountsState2Enabled,
    isRewardsAnnouncementEnabled,
    hasSeenBIP44IntroModal,
    hasSeenRewardsIntroModal,
    subscriptionId,
    dispatch,
    navigation,
  ]);

  useEffect(() => {
    const checkHasSeenRewardsIntroModal = async () => {
      const hasSeenModal = await StorageWrapper.getItem(
        REWARDS_GTM_MODAL_SHOWN,
      );
      setHasSeenRewardsIntroModal(hasSeenModal === 'true');
    };
    checkHasSeenRewardsIntroModal();
  }, []);

  useEffect(() => {
    checkAndShowRewardsIntroModal();
  }, [checkAndShowRewardsIntroModal]);

  return {
    isRewardsFeatureEnabled,
    hasSeenRewardsIntroModal,
  };
};
