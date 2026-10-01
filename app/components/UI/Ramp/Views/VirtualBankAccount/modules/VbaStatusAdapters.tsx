import React, { useCallback } from 'react';
import VbaOnboardingError, {
  type VbaOnboardingErrorVariant,
} from '../VbaOnboardingError';
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

interface VbaOnboardingErrorAdapterProps {
  variant: VbaOnboardingErrorVariant;
}

const VbaOnboardingErrorAdapter = ({
  variant,
}: VbaOnboardingErrorAdapterProps) => {
  const openOnboarding = useOpenVbaOnboarding(`${variant}-retry`);
  const handleRetry = useCallback(() => openOnboarding(), [openOnboarding]);

  return <VbaOnboardingError variant={variant} onRetry={handleRetry} />;
};

export const VbaKycPendingAdapter = () => (
  <VbaStatusAdapter variant="kyc_pending" />
);

export const VbaKycRejectedAdapter = () => (
  <VbaStatusAdapter variant="kyc_rejected" />
);

export const VbaAccountProvisioningErrorAdapter = () => (
  <VbaOnboardingErrorAdapter variant="account_provisioning_error" />
);

export const VbaErrorAdapter = () => (
  <VbaOnboardingErrorAdapter variant="error" />
);
