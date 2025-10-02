import React, { useCallback, useEffect } from 'react';
import OnboardingIntroStep from './OnboardingIntroStep';
import { strings } from '../../../../../../locales/i18n';
import storageWrapper from '../../../../../store/storage-wrapper';
import { REWARDS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';

const RewardsIntroModal = () => {
  const setHasSeenRewardsIntroModal = useCallback(async () => {
    await storageWrapper.setItem(REWARDS_GTM_MODAL_SHOWN, 'true');
  }, []);

  useEffect(() => {
    setHasSeenRewardsIntroModal();
  }, [setHasSeenRewardsIntroModal]);

  return (
    <OnboardingIntroStep
      title={strings('rewards.onboarding.gtm_title')}
      description={strings('rewards.onboarding.gtm_description')}
      confirmLabel={strings('rewards.onboarding.gtm_confirm')}
    />
  );
};

export default RewardsIntroModal;
