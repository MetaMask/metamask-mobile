import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsAnnouncementModalEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { selectMultichainAccountsIntroModalSeen } from '../../../../reducers/user';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  CURRENT_APP_VERSION,
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
 * 1. Rewards announcement feature flag is enabled
 * 2. The modal hasn't been seen before
 * 3. The MultichainAccountsIntroModal has been seen in a PREVIOUS session (not current)
 * 4. User does not have an active subscription
 */
export const useRewardsIntroModal = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

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

  // Track if BIP-44 modal was seen in current session
  const bip44SeenInCurrentSession = useRef(false);
  const initialBip44State = useRef(hasSeenBIP44IntroModal);

  // Update tracking when BIP-44 modal state changes
  useEffect(() => {
    // If BIP-44 modal state changed from false to true, it was seen in current session
    if (!initialBip44State.current && hasSeenBIP44IntroModal) {
      bip44SeenInCurrentSession.current = true;
    }
  }, [hasSeenBIP44IntroModal]);

  const checkAndShowRewardsIntroModal = useCallback(async () => {
    if (subscriptionId) {
      await StorageWrapper.setItem(REWARDS_GTM_MODAL_SHOWN, 'true');
      setHasSeenRewardsIntroModal(true);
      return;
    }

    // Check if this is a fresh install
    const currentAppVersion = await StorageWrapper.getItem(CURRENT_APP_VERSION);
    const lastAppVersion = await StorageWrapper.getItem(LAST_APP_VERSION);
    const isUpdate = !!lastAppVersion && currentAppVersion !== lastAppVersion;

    const shouldShow =
      isRewardsAnnouncementEnabled &&
      // BIP44 intro modal has been seen in a PREVIOUS session (not current)
      // OR it's a fresh install (which doesn't trigger bip44 modal)
      // OR bip44 is not enabled
      (!isMultichainAccountsState2Enabled ||
        (hasSeenBIP44IntroModal && !bip44SeenInCurrentSession.current) ||
        !isUpdate) &&
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
    isMultichainAccountsState2Enabled,
    isRewardsAnnouncementEnabled,
    hasSeenBIP44IntroModal,
    hasSeenRewardsIntroModal,
    subscriptionId,
    dispatch,
    navigation,
    bip44SeenInCurrentSession,
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
    hasSeenRewardsIntroModal,
  };
};
