import React, { useCallback } from 'react';
import VbaKycPending from '../../../../KYC/Views/Status/KycPending';
import VbaKycRejected from '../../../../KYC/Views/Status/KycRejected';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import { useVbaKycStatusRedirect } from '../../../../KYC/hooks/useKycStatusRedirect';
import { trackKycVerificationUpdated } from '../../../../KYC/utils/kycVerificationAnalytics';

interface VbaStatusAdapterProps {
  variant: VbaOnboardingStubVariant;
}

const VbaStatusAdapter = ({ variant }: VbaStatusAdapterProps) => {
  const advance = useOpenVbaOnboarding(`${variant}-retry`);
  const handleContinue = useCallback(() => advance(), [advance]);

  return <VbaOnboardingStub variant={variant} onContinue={handleContinue} />;
};

export const VbaKycPendingAdapter = () => {
  const leave = useVbaKycStatusRedirect();

  return <VbaKycPending onLeave={leave} />;
};

export const VbaKycRejectedAdapter = () => {
  const openOnboarding = useOpenVbaOnboarding('kyc_rejected-retry');
  const handleRetry = useCallback(() => {
    trackKycVerificationUpdated({
      status: 'retry_started',
      retrySource: 'kyc_rejected',
    });
    return openOnboarding({ retryRejectedKyc: true });
  }, [openOnboarding]);

  return <VbaKycRejected onRetry={handleRetry} />;
};

export const VbaAccountProvisioningErrorAdapter = () => (
  <VbaStatusAdapter variant="account_provisioning_error" />
);

export const VbaErrorAdapter = () => <VbaStatusAdapter variant="error" />;
