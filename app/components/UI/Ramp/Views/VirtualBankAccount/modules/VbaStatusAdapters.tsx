import React, { useCallback } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import VbaIllustration, { VbaIllustrationSource } from '../VbaIllustration';
import VbaKycRejected from '../VbaKycRejected';
import VbaOnboardingError from '../VbaOnboardingError';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';

type VbaOnboardingErrorVariant = 'account_provisioning_error' | 'error';

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

const VbaOnboardingErrorAdapter = ({
  variant,
}: {
  variant: VbaOnboardingErrorVariant;
}) => {
  const openOnboarding = useOpenVbaOnboarding(`${variant}-retry`);
  const handleRetry = useCallback(() => openOnboarding(), [openOnboarding]);

  return (
    <VbaOnboardingError
      illustration={<VbaIllustration source={VbaIllustrationSource.failure} />}
      title={strings(`virtual_bank_account.${variant}.title`)}
      description={strings(`virtual_bank_account.${variant}.description`)}
      primaryAction={{
        label: strings(`virtual_bank_account.${variant}.button`),
        onPress: handleRetry,
      }}
    />
  );
};

export const VbaAccountProvisioningErrorAdapter = () => (
  <VbaOnboardingErrorAdapter variant="account_provisioning_error" />
);

export const VbaErrorAdapter = () => (
  <VbaOnboardingErrorAdapter variant="error" />
);
