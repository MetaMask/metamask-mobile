import React, { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { selectMoneyMovementNeobank } from '../../../../../../selectors/featureFlagController/moneyAccount';
import KycPending from '../../../../KYC/Views/Status/KycPending';
import KycIdentityVerified from '../../../../KYC/Views/Status/IdentityVerified';
import KycRejected from '../../../../KYC/Views/Status/KycRejected';
import KycIdentityVerificationModule from '../../../../KYC/Views/SumSub/IdentityVerification';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';
import { selectKycSessionStatus } from '../../../../../../selectors/kycController';
import type { RootState } from '../../../../../../reducers';
import { VBA_KYC_VENDOR } from '../constants';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import {
  exitVbaOnboardingToMoneyHome,
  openVbaAccountSetup,
  useOpenVbaOnboarding,
} from '../hooks/useVbaOnboardingRouting';
import { VbaOnboardingRoutes, type VbaOnboardingParamList } from '../routes';
import { useVbaKycStatusRedirect } from '../../../../KYC/hooks/useKycStatusRedirect';
import { trackKycVerificationUpdated } from '../../../../KYC/utils/kycVerificationAnalytics';
import { endVbaCufJourney } from '../vbaCufTrace';
import { VBA_CUF_END_REASON } from '../vbaCufTags';

interface VbaStatusAdapterProps {
  variant: VbaOnboardingStubVariant;
}

const isRejectedKycSession = (
  sessionStatus: KycSessionStatus | null,
): boolean =>
  sessionStatus?.finalStatus === 'rejected' ||
  sessionStatus?.kycStatus === 'rejected';

/**
 * A session can re-enter SumSub only when its status is `retry` and neither
 * finalStatus nor kycStatus is the terminal `rejected` decision.
 */
const canRetryKycSession = (sessionStatus: KycSessionStatus | null): boolean =>
  !isRejectedKycSession(sessionStatus) &&
  (sessionStatus?.finalStatus === 'retry' ||
    sessionStatus?.kycStatus === 'retry');

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
  const navigation = useNavigation<AppNavigationProp>();
  const handleLeave = useCallback(() => {
    leave();
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    exitVbaOnboardingToMoneyHome(navigation);
  }, [leave, navigation]);
  useEffect(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.KYC_PENDING);
  }, []);

  return <KycPending onLeave={handleLeave} />;
};

export const VbaIdentityVerifiedAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { chooseCurrency } = useSelector(selectMoneyMovementNeobank);
  const handleExit = useCallback(() => {
    exitVbaOnboardingToMoneyHome(navigation);
  }, [navigation]);
  const handleContinue = useCallback(() => {
    openVbaAccountSetup(navigation, chooseCurrency);
  }, [chooseCurrency, navigation]);

  return (
    <KycIdentityVerified onExit={handleExit} onContinue={handleContinue} />
  );
};

type VbaIdentityVerificationAdapterProps = NativeStackScreenProps<
  VbaOnboardingParamList,
  typeof VbaOnboardingRoutes.IDENTITY_VERIFICATION
>;

export const VbaIdentityVerificationAdapter = (
  props: VbaIdentityVerificationAdapterProps,
) => {
  const navigation = useNavigation<AppNavigationProp>();
  const handleExit = useCallback(() => {
    exitVbaOnboardingToMoneyHome(navigation);
  }, [navigation]);

  return <KycIdentityVerificationModule {...props} onExit={handleExit} />;
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
  const sessionStatus = useSelector((state: RootState) =>
    selectKycSessionStatus(state, VBA_KYC_VENDOR),
  );
  useEffect(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.KYC_REJECTED);
  }, []);

  if (canRetryKycSession(sessionStatus)) {
    return <VbaKycRetryAction />;
  }

  return <VbaKycRejectedSupportAction />;
};

export const VbaAccountProvisioningErrorAdapter = () => (
  <VbaStatusAdapter variant="account_provisioning_error" />
);

export const VbaErrorAdapter = () => <VbaStatusAdapter variant="error" />;
