import React, { useCallback } from 'react';
import VbaKycRejected from '../VbaKycRejected';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';

interface VbaStatusAdapterProps {
  variant: VbaOnboardingStubVariant;
}

const VbaStatusAdapter = ({ variant }: VbaStatusAdapterProps) => {
  const advance = useOpenVbaOnboarding(`${variant}-retry`);
  const handleContinue = useCallback(() => advance(), [advance]);

  return <VbaOnboardingStub variant={variant} onContinue={handleContinue} />;
};

export const VbaKycPendingAdapter = () => (
  <VbaStatusAdapter variant="kyc_pending" />
);

export const VbaKycRejectedAdapter = () => {
  const openOnboarding = useOpenVbaOnboarding('kyc_rejected-retry');
  const handleRetry = useCallback(
    () => openOnboarding({ retryRejectedKyc: true }),
    [openOnboarding],
  );

  return <VbaKycRejected onRetry={handleRetry} />;
};

export const VbaAccountProvisioningErrorAdapter = () => (
  <VbaStatusAdapter variant="account_provisioning_error" />
);

export const VbaErrorAdapter = () => <VbaStatusAdapter variant="error" />;
