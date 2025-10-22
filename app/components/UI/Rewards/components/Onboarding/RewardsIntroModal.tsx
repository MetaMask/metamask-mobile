import React from 'react';
import OnboardingIntroStep from './OnboardingIntroStep';
import { strings } from '../../../../../../locales/i18n';

const RewardsIntroModal = () => (
  <OnboardingIntroStep
    title={strings('rewards.onboarding.gtm_title')}
    description={strings('rewards.onboarding.gtm_description')}
    confirmLabel={strings('rewards.onboarding.gtm_confirm')}
  />
);

export default RewardsIntroModal;
