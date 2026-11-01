import React from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import VbaOnboardingError from '../../components/OnboardingError';

export const VbaKycRejectedSelectorsIDs = {
  CONTAINER: 'vba-kyc-rejected-container',
  BACK_BUTTON: 'vba-kyc-rejected-back-button',
  CONTACT_SUPPORT_BUTTON: 'vba-kyc-rejected-contact-support-button',
  RETRY_BUTTON: 'vba-kyc-rejected-retry-button',
} as const;

type VbaKycRejectedAction = 'contactSupport' | 'retry';

interface VbaKycRejectedProps {
  /**
   * `contactSupport` is the terminal rejection action. `retry` re-enters
   * SumSub when the session KYC status is `retry`.
   */
  action: VbaKycRejectedAction;
  onAction: () => void | Promise<void>;
}

/**
 * Shown when VBA KYC is rejected, or when UKYC asked for a retry before the
 * provider flow was resubmitted. Rejection contacts support. A retryable
 * session re-enters identity verification.
 */
const VbaKycRejected = ({ action, onAction }: VbaKycRejectedProps) => {
  const isRetry = action === 'retry';

  return (
    <VbaOnboardingError
      testID={VbaKycRejectedSelectorsIDs.CONTAINER}
      backButtonTestID={VbaKycRejectedSelectorsIDs.BACK_BUTTON}
      title={strings('virtual_bank_account.kyc_rejected.title')}
      description={strings(
        isRetry
          ? 'virtual_bank_account.kyc_rejected.retry_description'
          : 'virtual_bank_account.kyc_rejected.description',
      )}
      items={[
        {
          id: 'identity-document',
          icon: IconName.Card,
          title: strings(
            'virtual_bank_account.kyc_rejected.identity_document_title',
          ),
          description: strings(
            'virtual_bank_account.kyc_rejected.identity_document_description',
          ),
        },
        {
          id: 'selfie',
          icon: IconName.FaceId,
          title: strings('virtual_bank_account.kyc_rejected.selfie_title'),
          description: strings(
            'virtual_bank_account.kyc_rejected.selfie_description',
          ),
        },
        {
          id: 'details',
          icon: IconName.UserCheck,
          title: strings('virtual_bank_account.kyc_rejected.details_title'),
          description: strings(
            'virtual_bank_account.kyc_rejected.details_description',
          ),
        },
      ]}
      primaryAction={{
        label: strings(
          isRetry
            ? 'virtual_bank_account.kyc_rejected.retry_button'
            : 'virtual_bank_account.kyc_rejected.button',
        ),
        onPress: onAction,
        testID: isRetry
          ? VbaKycRejectedSelectorsIDs.RETRY_BUTTON
          : VbaKycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON,
      }}
    />
  );
};

export default VbaKycRejected;
