import React, { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';
import VbaAccountCreateError from '../VbaAccountCreateError';
import {
  buildAccountCreateSupportUrl,
  getAccountCreateErrorPrimaryAction,
} from '../accountCreateError';
import {
  exitVbaOnboardingToMoneyHome,
  openCompletedVbaAccount,
  useOpenVbaOnboarding,
} from '../hooks/useVbaOnboardingRouting';
import type { VbaOnboardingParamList } from '../routes';
import { useScreenPerformance } from '../../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from '../vbaScreenPerformance';
import { endVbaCufJourney } from '../vbaCufTrace';
import { VBA_CUF_END_REASON } from '../vbaCufTags';

const SCREEN_ID_BY_VARIANT = {
  details: VBA_SCREEN_ID.ACCOUNT_CREATE_DETAILS_ERROR,
  generic: VBA_SCREEN_ID.ACCOUNT_CREATE_GENERIC_ERROR,
  unavailable: VBA_SCREEN_ID.ACCOUNT_CREATE_UNAVAILABLE_ERROR,
} as const;

/**
 * Wires the account-creation error screens into onboarding.
 * Validation and setup failures open support. Only HTTP 500 can be retried.
 * When mUSD is not offered to the customer, leaving is the main action.
 */
const VbaAccountCreateErrorAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<VbaOnboardingParamList, 'VbaAccountCreateError'>>();
  const { variant, failure, sourceCurrency, retryable } = route.params;
  useScreenPerformance({
    config: VBA_SCREEN_PERFORMANCE_CONFIG,
    screenId: SCREEN_ID_BY_VARIANT[variant],
    contentReady: true,
    contentState: VBA_SCREEN_CONTENT_STATE.ERROR,
  });
  useEffect(() => {
    endVbaCufJourney(false, VBA_CUF_END_REASON.ERROR);
  }, []);
  const primaryActionType = retryable
    ? 'retry'
    : getAccountCreateErrorPrimaryAction(failure);
  const retryStartedRef = useRef(false);
  const resumeOnboarding = useOpenVbaOnboarding('account-create-error-retry');
  const { openSupportWithConsent } = useSupportConsent();

  const leave = useCallback(() => {
    exitVbaOnboardingToMoneyHome(navigation);
  }, [navigation]);

  const contactSupport = useCallback(() => {
    openSupportWithConsent(
      (url) => Linking.openURL(url),
      buildAccountCreateSupportUrl(METAMASK_SUPPORT_URL, failure),
    );
  }, [failure, openSupportWithConsent]);

  const retry = useCallback(async () => {
    if (retryStartedRef.current) {
      return;
    }
    retryStartedRef.current = true;

    if (sourceCurrency) {
      openCompletedVbaAccount(navigation);
      return;
    }
    await resumeOnboarding();
  }, [navigation, resumeOnboarding, sourceCurrency]);

  if (variant === 'unavailable') {
    return (
      <VbaAccountCreateError
        variant="unavailable"
        primaryActionType="done"
        onPrimary={leave}
        onSecondary={contactSupport}
        onBack={leave}
      />
    );
  }

  if (variant === 'details') {
    return (
      <VbaAccountCreateError
        variant="details"
        primaryActionType="contactSupport"
        onPrimary={contactSupport}
        onSecondary={leave}
        onBack={leave}
      />
    );
  }

  return (
    <VbaAccountCreateError
      variant="generic"
      primaryActionType={primaryActionType}
      onPrimary={primaryActionType === 'retry' ? retry : contactSupport}
      onSecondary={leave}
      onBack={leave}
    />
  );
};

export default VbaAccountCreateErrorAdapter;
