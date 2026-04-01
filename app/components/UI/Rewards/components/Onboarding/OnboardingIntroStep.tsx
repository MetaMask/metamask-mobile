import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';

import { setCandidateSubscriptionId } from '../../../../../actions/rewards';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectCandidateSubscriptionId,
  selectOptinAllowedForGeoError,
} from '../../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { strings } from '../../../../../../locales/i18n';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { isHardwareAccount } from '../../../../../util/address';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { REWARDS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import storageWrapper from '../../../../../store/storage-wrapper';
import OnboardingNoActiveSeasonStep from './OnboardingNoActiveSeasonStep';

export interface OnboardingIntroStepProps {
  title?: string;
  description?: string;
  confirmLabel?: string;
}

/**
 * OnboardingIntroStep Component
 *
 * Main introduction screen for the rewards onboarding flow.
 * Handles geo validation, account type checking, and always shows the
 * no-active-season sign-up variant.
 */
const OnboardingIntroStep: React.FC<OnboardingIntroStepProps> = () => {
  // Navigation and Redux hooks
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const setHasSeenRewardsIntroModal = useCallback(async () => {
    await storageWrapper.setItem(REWARDS_GTM_MODAL_SHOWN, 'true');
  }, []);

  useEffect(() => {
    setHasSeenRewardsIntroModal();
  }, [setHasSeenRewardsIntroModal]);

  // Selectors
  const optinAllowedForGeo = useSelector(selectOptinAllowedForGeo);
  const optinAllowedForGeoLoading = useSelector(
    selectOptinAllowedForGeoLoading,
  );
  const accountGroupAccounts = useSelector(
    selectSelectedAccountGroupInternalAccounts,
  );
  const optinAllowedForGeoError = useSelector(selectOptinAllowedForGeoError);
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  // Computed state
  const candidateSubscriptionIdLoading =
    !subscriptionId &&
    (candidateSubscriptionId === 'pending' ||
      candidateSubscriptionId === 'retry');
  const candidateSubscriptionIdError = candidateSubscriptionId === 'error';

  // If we don't know of a subscription id, we need to fetch the geo rewards metadata
  const { fetchGeoRewardsMetadata } = useGeoRewardsMetadata({
    enabled:
      !subscriptionId &&
      (!candidateSubscriptionId || candidateSubscriptionIdError),
  });

  /**
   * Shows error modal for unsupported scenarios
   */
  const showErrorModal = useCallback(
    (titleKey: string, descriptionKey: string) => {
      navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
        title: strings(titleKey),
        description: strings(descriptionKey),
        confirmAction: {
          label: strings('rewards.onboarding.not_supported_confirm_go_back'),
          // eslint-disable-next-line no-empty-function
          onPress: () => {
            navigation.goBack();
          },
          variant: ButtonVariant.Primary,
        },
      });
    },
    [navigation],
  );

  /**
   * Shows error modal with retry functionality
   */
  const showRetryErrorModal = useCallback(
    (titleKey: string, descriptionKey: string, onRetry: () => void) => {
      navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
        title: strings(titleKey),
        description: strings(descriptionKey),
        confirmAction: {
          label: strings('rewards.onboarding.not_supported_confirm_retry'),
          onPress: () => {
            onRetry();
            navigation.goBack();
          },
          variant: ButtonVariant.Primary,
        },
        onCancel: () => {
          navigation.goBack();
          navigation.navigate(Routes.WALLET_VIEW);
        },
        cancelLabel: strings(
          'rewards.onboarding.not_supported_confirm_go_back',
        ),
      });
    },
    [navigation],
  );

  const canContinue = useCallback(() => {
    // Show geo error modal if geo check failed
    if (
      optinAllowedForGeoError &&
      !optinAllowedForGeo &&
      !optinAllowedForGeoLoading &&
      !subscriptionId
    ) {
      showRetryErrorModal(
        'rewards.onboarding.geo_check_fail_title',
        'rewards.onboarding.geo_check_fail_description',
        fetchGeoRewardsMetadata,
      );
      return false;
    }

    // Check for geo restrictions - only if geo metadata has been fetched
    if (optinAllowedForGeo !== null && !optinAllowedForGeo) {
      showErrorModal(
        'rewards.onboarding.not_supported_region_title',
        'rewards.onboarding.not_supported_region_description',
      );
      return false;
    }

    // Check for hardware account restrictions for default account associated with group.
    if (
      accountGroupAccounts.some((account) =>
        isHardwareAccount(account?.address),
      )
    ) {
      showErrorModal(
        'rewards.onboarding.not_supported_hardware_account_title',
        'rewards.onboarding.not_supported_hardware_account_description',
      );
      return false;
    }

    // Check if any account in the active account group is supported for opt-in
    const hasAnySupportedAccount = accountGroupAccounts.some((account) => {
      try {
        return Engine.controllerMessenger.call(
          'RewardsController:isOptInSupported',
          account,
        );
      } catch {
        return false;
      }
    });

    if (!hasAnySupportedAccount) {
      showErrorModal(
        'rewards.onboarding.not_supported_account_type_title',
        'rewards.onboarding.not_supported_account_type_description',
      );
      return false;
    }

    return true;
  }, [
    optinAllowedForGeoError,
    optinAllowedForGeo,
    optinAllowedForGeoLoading,
    subscriptionId,
    accountGroupAccounts,
    showRetryErrorModal,
    fetchGeoRewardsMetadata,
    showErrorModal,
  ]);

  const { trackEvent, createEventBuilder } = useMetrics();
  const hasTrackedOnboardingStart = useRef(false);

  /**
   * Auto-redirect to dashboard if user is already opted in
   */
  useFocusEffect(
    useCallback(() => {
      if (subscriptionId) {
        navigation.navigate(Routes.REWARDS_DASHBOARD);
      } else if (!hasTrackedOnboardingStart.current) {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.REWARDS_ONBOARDING_STARTED,
          ).build(),
        );
        hasTrackedOnboardingStart.current = true;
      }
    }, [subscriptionId, navigation, trackEvent, createEventBuilder]),
  );

  /**
   * Show error modals for geo and auth failures
   */
  useFocusEffect(
    useCallback(() => {
      // Show auth error modal if auth failed
      if (candidateSubscriptionIdError && !subscriptionId) {
        showRetryErrorModal(
          'rewards.onboarding.auth_fail_title',
          'rewards.onboarding.auth_fail_description',
          () => {
            dispatch(setCandidateSubscriptionId('retry'));
          },
        );
        return;
      }
    }, [
      candidateSubscriptionIdError,
      subscriptionId,
      showRetryErrorModal,
      dispatch,
    ]),
  );

  if (candidateSubscriptionIdLoading || !!subscriptionId) {
    return <Skeleton width="100%" height="100%" />;
  }

  return (
    <OnboardingNoActiveSeasonStep
      canContinue={canContinue}
      geoLoading={optinAllowedForGeoLoading}
    />
  );
};

export default OnboardingIntroStep;
