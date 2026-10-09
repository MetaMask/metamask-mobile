import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import VbaIllustration, { VbaIllustrationSource } from './VbaIllustration';
import VbaOnboardingStatusScreen from './VbaOnboardingStatusScreen';

export const VbaKycSuccessSelectorsIDs = {
  CONTAINER: 'vba-kyc-success',
  CONTINUE_BUTTON: 'vba-kyc-success-continue-button',
} as const;

interface VbaKycSuccessProps {
  onContinue: () => void;
}

/**
 * Shown after identity verification succeeds. The caller decides where Continue goes.
 */
const VbaKycSuccess = ({ onContinue }: VbaKycSuccessProps) => (
  <VbaOnboardingStatusScreen
    visual={<VbaIllustration source={VbaIllustrationSource.check} />}
    title={strings('virtual_bank_account.kyc_verified.title')}
    description={strings('virtual_bank_account.kyc_verified.description')}
    action={{
      label: strings('virtual_bank_account.kyc_verified.button'),
      onPress: onContinue,
      testID: VbaKycSuccessSelectorsIDs.CONTINUE_BUTTON,
    }}
    testID={VbaKycSuccessSelectorsIDs.CONTAINER}
  />
);

export default VbaKycSuccess;
