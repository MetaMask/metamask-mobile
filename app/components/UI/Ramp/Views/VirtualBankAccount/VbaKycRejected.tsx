import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import VbaIllustration, { VbaIllustrationSource } from './VbaIllustration';
import VbaOnboardingError from './VbaOnboardingError';

export const VbaKycRejectedSelectorsIDs = {
  CONTAINER: 'vba-kyc-rejected-container',
  BACK_BUTTON: 'vba-kyc-rejected-back-button',
  RETRY_BUTTON: 'vba-kyc-rejected-retry-button',
} as const;

interface VbaKycRejectedProps {
  onRetry: () => void | Promise<void>;
}

/**
 * Shown when VBA KYC is rejected. Retry re-enters identity verification
 * instead of refreshing this screen while the session is still rejected.
 */
const VbaKycRejected = ({ onRetry }: VbaKycRejectedProps) => (
  <VbaOnboardingError
    testID={VbaKycRejectedSelectorsIDs.CONTAINER}
    backButtonTestID={VbaKycRejectedSelectorsIDs.BACK_BUTTON}
    illustration={<VbaIllustration source={VbaIllustrationSource.hazard} />}
    title={strings('virtual_bank_account.kyc_rejected.title')}
    description={strings('virtual_bank_account.kyc_rejected.description')}
    primaryAction={{
      label: strings('virtual_bank_account.kyc_rejected.button'),
      onPress: onRetry,
      testID: VbaKycRejectedSelectorsIDs.RETRY_BUTTON,
    }}
  />
);

export default VbaKycRejected;
