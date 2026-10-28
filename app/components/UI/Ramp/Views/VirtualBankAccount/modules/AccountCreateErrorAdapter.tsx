import React, { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import Routes from '../../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../../constants/urls';
import { useSupportConsent } from '../../../../../hooks/useSupportConsent';
import VbaAccountCreateError from '../VbaAccountCreateError';
import {
  buildAccountCreateSupportUrl,
  getAccountCreateErrorPrimaryAction,
} from '../accountCreateError';
import {
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

/**
 * Wires the account-creation error screens into onboarding.
 * Validation and setup failures open support. Only HTTP 500 can be retried.
 */
const VbaAccountCreateErrorAdapter = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<VbaOnboardingParamList, 'VbaAccountCreateError'>>();
  const { variant, failure, sourceCurrency, retryable } = route.params;
  useScreenPerformance({
    config: VBA_SCREEN_PERFORMANCE_CONFIG,
    screenId:
      variant === 'details'
        ? VBA_SCREEN_ID.ACCOUNT_CREATE_DETAILS_ERROR
        : VBA_SCREEN_ID.ACCOUNT_CREATE_GENERIC_ERROR,
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
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
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
      openCompletedVbaAccount(navigation, sourceCurrency);
      return;
    }
    await resumeOnboarding();
  }, [navigation, resumeOnboarding, sourceCurrency]);

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
