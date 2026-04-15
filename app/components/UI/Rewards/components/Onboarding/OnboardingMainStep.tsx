import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextField,
  TextVariant,
  ButtonVariant,
  IconSize,
  Icon,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { setCandidateSubscriptionId } from '../../../../../actions/rewards';
import Routes from '../../../../../constants/navigation/Routes';
import step1Img from '../../../../../images/rewards/rewards-onboarding-step1.png';
import {
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectCandidateSubscriptionId,
  selectOptinAllowedForGeoError,
  selectOnboardingReferralCode,
} from '../../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { strings } from '../../../../../../locales/i18n';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import { useOptin } from '../../hooks/useOptIn';
import { useValidateReferralCode } from '../../hooks/useValidateReferralCode';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { isHardwareAccount } from '../../../../../util/address';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { REWARDS_GTM_MODAL_SHOWN } from '../../../../../constants/storage';
import storageWrapper from '../../../../../store/storage-wrapper';
import OnboardingStepComponent from './OnboardingStep';
import RewardsErrorBanner from '../RewardsErrorBanner';
import RewardsLegalDisclaimer from './RewardsLegalDisclaimer';

const OnboardingMainStep: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const dispatch = useDispatch();

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
  const onboardingReferralCode = useSelector(selectOnboardingReferralCode);

  // Opt-in hook
  const { optin, optinError, optinLoading } = useOptin();

  // Referral code
  const {
    referralCode,
    setReferralCode: handleReferralCodeChange,
    isValidating: isValidatingReferralCode,
    isValid: referralCodeIsValid,
    isUnknownError: isUnknownErrorReferralCode,
  } = useValidateReferralCode(
    onboardingReferralCode
      ? onboardingReferralCode.trim().toUpperCase()
      : undefined,
  );

  const isPrefilledReferral = Boolean(onboardingReferralCode);
  const [showReferralInput, setShowReferralInput] =
    useState(isPrefilledReferral);

  // Candidate subscription ID state
  const candidateSubscriptionIdLoading =
    !subscriptionId &&
    (candidateSubscriptionId === 'pending' ||
      candidateSubscriptionId === 'retry');
  const candidateSubscriptionIdError = candidateSubscriptionId === 'error';

  // Geo metadata fetch
  const { fetchGeoRewardsMetadata } = useGeoRewardsMetadata({
    enabled:
      !subscriptionId &&
      (!candidateSubscriptionId || candidateSubscriptionIdError),
  });

  // Mark intro as seen
  useEffect(() => {
    storageWrapper.setItem(REWARDS_GTM_MODAL_SHOWN, 'true');
  }, []);

  // Analytics
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedOnboardingStart = useRef(false);

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

    if (optinAllowedForGeo !== null && !optinAllowedForGeo) {
      showErrorModal(
        'rewards.onboarding.not_supported_region_title',
        'rewards.onboarding.not_supported_region_description',
      );
      return false;
    }

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

  const handleNext = useCallback(() => {
    if (!canContinue()) {
      return;
    }
    optin({
      referralCode,
      isPrefilled: isPrefilledReferral,
      bulkLink: true,
    });
  }, [optin, canContinue, referralCode, isPrefilledReferral]);

  // Auto-redirect + analytics tracking
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

  // Show auth error modal on focus
  useFocusEffect(
    useCallback(() => {
      if (candidateSubscriptionIdError && !subscriptionId) {
        showRetryErrorModal(
          'rewards.onboarding.auth_fail_title',
          'rewards.onboarding.auth_fail_description',
          () => {
            dispatch(setCandidateSubscriptionId('retry'));
          },
        );
      }
    }, [
      candidateSubscriptionIdError,
      subscriptionId,
      showRetryErrorModal,
      dispatch,
    ]),
  );

  // Loading gate: show skeleton while auth or subscription is resolving
  if (candidateSubscriptionIdLoading || !!subscriptionId) {
    return <Skeleton width="100%" height="100%" />;
  }

  const renderReferralIcon = () => {
    if (isValidatingReferralCode) {
      return <ActivityIndicator />;
    }
    if (referralCodeIsValid) {
      return (
        <Icon
          name={IconName.Confirmation}
          size={IconSize.Lg}
          color={IconColor.SuccessDefault}
        />
      );
    }
    if (referralCode.length >= 6) {
      return (
        <Icon
          name={IconName.Error}
          size={IconSize.Lg}
          color={IconColor.ErrorDefault}
        />
      );
    }
    return null;
  };

  const renderStepImage = () => (
    <Image
      source={step1Img}
      style={tw.style('w-50 h-50')}
      testID="onboarding-main-image"
      resizeMode="contain"
    />
  );

  const renderStepInfo = () => (
    <Box twClassName="flex-col gap-2 min-h-30">
      {optinError && (
        <RewardsErrorBanner
          title={strings('rewards.optin_error.title')}
          description={strings('rewards.optin_error.description')}
        />
      )}

      <Box twClassName="w-full gap-4">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('rewards.onboarding.title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center text-alternative"
        >
          {strings('rewards.onboarding.description')}
        </Text>
      </Box>
    </Box>
  );

  const renderReferralSection = () => (
    <Box twClassName="w-full items-center gap-2 mt-2">
      {!showReferralInput && (
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-text-alternative my-2"
          onPress={() => setShowReferralInput(true)}
          testID="referral-prompt"
        >
          {strings('rewards.onboarding.referral_prompt')}
        </Text>
      )}

      {showReferralInput && (
        <Box twClassName="w-full gap-2">
          <Box twClassName="gap-1">
            <TextField
              placeholder={strings('rewards.onboarding.referral_placeholder')}
              value={referralCode}
              autoCapitalize="characters"
              maxLength={6}
              onChangeText={handleReferralCodeChange}
              isDisabled={optinLoading}
              endAccessory={renderReferralIcon()}
              testID="referral-input"
              isError={
                referralCode.length >= 6 &&
                !referralCodeIsValid &&
                !isValidatingReferralCode &&
                !isUnknownErrorReferralCode
              }
            />
            {referralCode.length >= 6 &&
              !referralCodeIsValid &&
              !isValidatingReferralCode &&
              !isUnknownErrorReferralCode && (
                <Text twClassName="text-error-default">
                  {strings('rewards.onboarding.step4_referral_input_error')}
                </Text>
              )}
          </Box>

          {isUnknownErrorReferralCode && (
            <RewardsErrorBanner
              title={strings('rewards.referral_validation_unknown_error.title')}
              description={strings(
                'rewards.referral_validation_unknown_error.description',
              )}
            />
          )}
        </Box>
      )}
    </Box>
  );

  const renderLegalDisclaimer = () => (
    <Box twClassName="w-full">
      <RewardsLegalDisclaimer
        disclaimerPart1={strings('rewards.onboarding.legal_disclaimer_1')}
        disclaimerPart2={strings('rewards.onboarding.legal_disclaimer_2')}
        disclaimerPart3={strings('rewards.onboarding.legal_disclaimer_3')}
        disclaimerPart4={strings('rewards.onboarding.legal_disclaimer_4')}
      />
    </Box>
  );

  const geoLoading = optinAllowedForGeoLoading;
  const isLoading = optinLoading || geoLoading || isValidatingReferralCode;
  let onNextLoadingText = '';
  if (isLoading) {
    if (optinLoading) {
      onNextLoadingText = strings('rewards.onboarding.sign_up_loading');
    } else if (isValidatingReferralCode) {
      onNextLoadingText = strings(
        'rewards.onboarding.step4_title_referral_validating',
      );
    } else {
      onNextLoadingText = strings(
        'rewards.onboarding.intro_confirm_geo_loading',
      );
    }
  }

  const onNextDisabled =
    (!referralCodeIsValid && !!referralCode) ||
    !!subscriptionId ||
    isUnknownErrorReferralCode;

  return (
    <OnboardingStepComponent
      currentStep={1}
      onNext={handleNext}
      onNextLoading={isLoading}
      onNextLoadingText={onNextLoadingText}
      onNextDisabled={onNextDisabled}
      nextButtonText={strings('rewards.onboarding.sign_up')}
      renderStepImage={renderStepImage}
      renderStepInfo={renderStepInfo}
      renderReferralSection={renderReferralSection}
      renderLegalDisclaimer={renderLegalDisclaimer}
      disableSwipe
      showProgressIndicator={false}
    />
  );
};

export default OnboardingMainStep;
