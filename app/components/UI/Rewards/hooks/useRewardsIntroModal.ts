import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectRewardsAnnouncementModalEnabledFlag,
  selectRewardsEnabledFlag,
} from '../../../../selectors/featureFlagController/rewards';
import { selectMultichainAccountsIntroModalSeen } from '../../../../reducers/user';
import StorageWrapper from '../../../../store/storage-wrapper';
import { REWARDS_GTM_MODAL_SHOWN } from '../../../../constants/storage';
import Routes from '../../../../constants/navigation/Routes';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';

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

  const isRewardsFeatureEnabled = useSelector(selectRewardsEnabledFlag);
  const isRewardsAnnouncementEnabled = useSelector(
    selectRewardsAnnouncementModalEnabledFlag,
  );

  const hasSeenBIP44IntroModal = useSelector(
    selectMultichainAccountsIntroModalSeen,
  );

  const [hasSeenRewardsIntroModal, setHasSeenRewardsIntroModal] =
    useState(true);

  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  const checkAndShowRewardsIntroModal = useCallback(async () => {
    const shouldShow =
      isRewardsFeatureEnabled &&
      isRewardsAnnouncementEnabled &&
      hasSeenBIP44IntroModal &&
      !hasSeenRewardsIntroModal &&
      !subscriptionId;

    if (shouldShow && !isE2ETest) {
      navigation.navigate(Routes.REWARDS_VIEW, {
        screen: Routes.REWARDS_ONBOARDING_FLOW,
        params: { screen: Routes.MODAL.REWARDS_INTRO_MODAL },
      });
    }
  }, [
    isRewardsFeatureEnabled,
    isRewardsAnnouncementEnabled,
    hasSeenBIP44IntroModal,
    hasSeenRewardsIntroModal,
    subscriptionId,
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
