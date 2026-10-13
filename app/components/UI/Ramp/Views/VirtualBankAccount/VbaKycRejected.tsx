import React from 'react';
import { IconName } from '@metamask/design-system-react-native';
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
    illustration={
      <VbaIllustration
        source={VbaIllustrationSource.hazard}
        twClassName="h-[65px] w-[72px]"
      />
    }
    title={strings('virtual_bank_account.kyc_rejected.title')}
    description={strings('virtual_bank_account.kyc_rejected.description')}
    items={[
      {
        id: 'identity-document',
        icon: IconName.Gift,
        title: strings(
          'virtual_bank_account.kyc_rejected.identity_document_title',
        ),
        description: strings(
          'virtual_bank_account.kyc_rejected.identity_document_description',
        ),
      },
      {
        id: 'selfie',
        icon: IconName.Gift,
        title: strings('virtual_bank_account.kyc_rejected.selfie_title'),
        description: strings(
          'virtual_bank_account.kyc_rejected.selfie_description',
        ),
      },
      {
        id: 'details',
        icon: IconName.Gift,
        title: strings('virtual_bank_account.kyc_rejected.details_title'),
        description: strings(
          'virtual_bank_account.kyc_rejected.details_description',
        ),
      },
    ]}
    primaryAction={{
      label: strings('virtual_bank_account.kyc_rejected.button'),
      onPress: onRetry,
      testID: VbaKycRejectedSelectorsIDs.RETRY_BUTTON,
    }}
  />
);

export default VbaKycRejected;
