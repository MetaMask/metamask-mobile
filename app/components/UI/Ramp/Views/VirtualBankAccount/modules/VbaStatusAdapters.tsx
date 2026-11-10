import React, { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import KycPending from '../../../../KYC/Views/Status/KycPending';
import KycRejected from '../../../../KYC/Views/Status/KycRejected';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';
import type { RootState } from '../../../../../../reducers';
import { VBA_KYC_VENDOR } from '../constants';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import { useOpenVbaOnboarding } from '../hooks/useVbaOnboardingRouting';
import { useVbaKycStatusRedirect } from '../../../../KYC/hooks/useKycStatusRedirect';
import { trackKycVerificationUpdated } from '../../../../KYC/utils/kycVerificationAnalytics';
import { endVbaCufJourney } from '../vbaCufTrace';
import { VBA_CUF_END_REASON } from '../vbaCufTags';

interface VbaStatusAdapterProps {
  variant: VbaOnboardingStubVariant;
}

/**
 * kyc-api's step for `iron`. `kyc_retry` re-enters SumSub; `kyc_rejected` is
 * final and contacts support.
 */
const selectVbaKycStep = (state: RootState) =>
  state.engine.backgroundState.KycController?.sessions?.[VBA_KYC_VENDOR]
    ?.nextStep ?? null;

const VbaStatusAdapter = ({ variant }: VbaStatusAdapterProps) => {
  const advance = useOpenVbaOnboarding(`${variant}-retry`);
  const handleContinue = useCallback(() => advance(), [advance]);
  useEffect(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.ERROR);
  }, []);

  return <VbaOnboardingStub variant={variant} onContinue={handleContinue} />;
};

export const VbaKycPendingAdapter = () => {
  const leave = useVbaKycStatusRedirect();
  useEffect(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.KYC_PENDING);
  }, []);

  return <KycPending onLeave={leave} />;
};

const VbaKycRetryAction = () => {
  const openOnboarding = useOpenVbaOnboarding('kyc_rejected-retry');
  const handleRetry = useCallback(() => {
    trackKycVerificationUpdated({
      status: 'retry_started',
      retrySource: 'kyc_rejected',
    });
    return openOnboarding({ retryRejectedKyc: true });
  }, [openOnboarding]);

  return <KycRejected action="retry" onAction={handleRetry} />;
};

const VbaKycRejectedSupportAction = () => {
  const { openSupportWithConsent } = useSupportConsent();
  const handleContactSupport = useCallback(() => {
    openSupportWithConsent((url) => Linking.openURL(url), METAMASK_SUPPORT_URL);
  }, [openSupportWithConsent]);

  return (
    <KycRejected action="contactSupport" onAction={handleContactSupport} />
  );
};

export const VbaKycRejectedAdapter = () => {
  const step = useSelector(selectVbaKycStep);
  useEffect(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.KYC_REJECTED);
  }, []);

  if (step === 'kyc_retry') {
    return <VbaKycRetryAction />;
  }

  return <VbaKycRejectedSupportAction />;
};

export const VbaAccountProvisioningErrorAdapter = () => (
  <VbaStatusAdapter variant="account_provisioning_error" />
);

export const VbaErrorAdapter = () => <VbaStatusAdapter variant="error" />;
