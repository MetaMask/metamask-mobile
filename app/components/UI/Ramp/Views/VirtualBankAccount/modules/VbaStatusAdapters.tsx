import React, { useCallback, useEffect } from 'react';
import { Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { KycSessionStatus } from '@metamask/kyc-controller';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectMoneyMovementNeobank } from '../../../../../../selectors/featureFlagController/moneyAccount';
import VbaIdentityVerified from '../../../../KYC/Views/Status/IdentityVerified';
import VbaKycPending from '../../../../KYC/Views/Status/KycPending';
import VbaKycRejected from '../../../../KYC/Views/Status/KycRejected';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';
import { selectKycSessionStatus } from '../../../../../../selectors/kycController';
import VbaOnboardingStub, {
  type VbaOnboardingStubVariant,
} from '../VbaOnboardingStub';
import {
  navigateToVbaOnboardingDestination,
  useOpenVbaOnboarding,
} from '../hooks/useVbaOnboardingRouting';
import { useStartVbaAccountSetupEarly } from '../hooks/useStartVbaAccountSetupEarly';
import { VbaOnboardingRoutes } from '../routes';
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

/**
 * KYC approved, no usable autoramp yet. Starts account setup early, then
 * Continue opens Choose Currency when `moneyMovementNeobank.chooseCurrency`
 * is on, otherwise account details. Back goes to Money home.
 */
export const VbaIdentityVerifiedAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { chooseCurrency } = useSelector(selectMoneyMovementNeobank);
  useStartVbaAccountSetupEarly();

  const handleBack = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (chooseCurrency) {
      navigation.dispatch(
        StackActions.push(VbaOnboardingRoutes.CHOOSE_CURRENCY),
      );
      return;
    }
    navigateToVbaOnboardingDestination(navigation, 'complete');
  }, [chooseCurrency, navigation]);

  return (
    <VbaIdentityVerified onBack={handleBack} onContinue={handleContinue} />
  );
};

export const VbaKycPendingAdapter = () => {
  const leave = useVbaKycStatusRedirect();
  useEffect(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.KYC_PENDING);
  }, []);

  return <VbaKycPending onLeave={leave} />;
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

  return <VbaKycRejected action="retry" onAction={handleRetry} />;
};

const VbaKycRejectedSupportAction = () => {
  const { openSupportWithConsent } = useSupportConsent();
  const handleContactSupport = useCallback(() => {
    openSupportWithConsent((url) => Linking.openURL(url), METAMASK_SUPPORT_URL);
  }, [openSupportWithConsent]);

  return (
    <VbaKycRejected action="contactSupport" onAction={handleContactSupport} />
  );
};

export const VbaKycRejectedAdapter = () => {
  const sessionStatus = useSelector(selectKycSessionStatus);
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
