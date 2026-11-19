import React from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import KycOnboardingError from '../../components/OnboardingError';

export const KycRejectedSelectorsIDs = {
  CONTAINER: 'kyc-rejected-container',
  BACK_BUTTON: 'kyc-rejected-back-button',
  CONTACT_SUPPORT_BUTTON: 'kyc-rejected-contact-support-button',
  RETRY_BUTTON: 'kyc-rejected-retry-button',
} as const;

type KycRejectedAction = 'contactSupport' | 'retry';

interface KycRejectedProps {
  /**
   * `contactSupport` is the terminal rejection action. `retry` re-enters
   * SumSub when the session KYC status is `retry`.
   */
  action: KycRejectedAction;
  onAction: () => void | Promise<void>;
}

/**
 * Shown when VBA KYC is rejected, or when UKYC asked for a retry before the
 * provider flow was resubmitted. Rejection contacts support. A retryable
 * session re-enters identity verification.
 */
const KycRejected = ({ action, onAction }: KycRejectedProps) => {
  useTrackKycResultViewed('rejected');
  const isRetry = action === 'retry';

  return (
    <KycOnboardingError
      testID={KycRejectedSelectorsIDs.CONTAINER}
      backButtonTestID={KycRejectedSelectorsIDs.BACK_BUTTON}
      title={strings('kyc.kyc_rejected.title')}
      description={strings(
        isRetry
          ? 'kyc.kyc_rejected.retry_description'
          : 'kyc.kyc_rejected.description',
      )}
      items={[
        {
          id: 'identity-document',
          icon: IconName.Card,
          title: strings('kyc.kyc_rejected.identity_document_title'),
          description: strings(
            'kyc.kyc_rejected.identity_document_description',
          ),
        },
        {
          id: 'selfie',
          icon: IconName.FaceId,
          title: strings('kyc.kyc_rejected.selfie_title'),
          description: strings('kyc.kyc_rejected.selfie_description'),
        },
        {
          id: 'details',
          icon: IconName.UserCheck,
          title: strings('kyc.kyc_rejected.details_title'),
          description: strings('kyc.kyc_rejected.details_description'),
        },
      ]}
      primaryAction={{
        label: strings(
          isRetry ? 'kyc.kyc_rejected.retry_button' : 'kyc.kyc_rejected.button',
        ),
        onPress: onAction,
        testID: isRetry
          ? KycRejectedSelectorsIDs.RETRY_BUTTON
          : KycRejectedSelectorsIDs.CONTACT_SUPPORT_BUTTON,
      }}
    />
  );
};

export default KycRejected;
