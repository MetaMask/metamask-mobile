import React, { useCallback } from 'react';
import { Image, ImageBackground, Text as RNText } from 'react-native';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button as DSRNButton,
  ButtonVariant,
  ButtonSize as DSRNButtonSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { Skeleton } from '../../../../../component-library/components/Skeleton';

import {
  setOnboardingActiveStep,
  setCandidateSubscriptionId,
} from '../../../../../actions/rewards';
import Routes from '../../../../../constants/navigation/Routes';
import introBg from '../../../../../images/rewards/rewards-onboarding-intro-bg.png';
import intro from '../../../../../images/rewards/rewards-onboarding-intro.png';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import {
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectCandidateSubscriptionId,
  selectOptinAllowedForGeoError,
} from '../../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { strings } from '../../../../../../locales/i18n';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import Engine from '../../../../../core/Engine';

/**
 * OnboardingIntroStep Component
 *
 * Main introduction screen for the rewards onboarding flow.
 * Handles geo validation, account type checking, and navigation to next steps.
 */
const OnboardingIntroStep: React.FC = () => {
  // Navigation and Redux hooks
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();

  // Selectors
  const optinAllowedForGeo = useSelector(selectOptinAllowedForGeo);
  const optinAllowedForGeoLoading = useSelector(
    selectOptinAllowedForGeoLoading,
  );
  const internalAccount = useSelector(selectSelectedInternalAccount);
  const optinAllowedForGeoError = useSelector(selectOptinAllowedForGeoError);
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  // Computed state
  const candidateSubscriptionIdLoading =
    !subscriptionId && candidateSubscriptionId === 'pending';
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

  /**
   * Handles the confirm/continue button press
   */
  const handleNext = useCallback(async () => {
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
      return;
    }

    // Check for geo restrictions
    if (!optinAllowedForGeo) {
      showErrorModal(
        'rewards.onboarding.not_supported_region_title',
        'rewards.onboarding.not_supported_region_description',
      );
      return;
    }

    // Check for hardware account restrictions
    if (internalAccount && isHardwareAccount(internalAccount?.address)) {
      showErrorModal(
        'rewards.onboarding.not_supported_hardware_account_title',
        'rewards.onboarding.not_supported_hardware_account_description',
      );
      return;
    }

    // Check if account type is supported for opt-in
    if (
      internalAccount &&
      !Engine.controllerMessenger.call(
        'RewardsController:isOptInSupported',
        internalAccount,
      )
    ) {
      showErrorModal(
        'rewards.onboarding.not_supported_account_type_title',
        'rewards.onboarding.not_supported_account_type_description',
      );
      return;
    }

    // Proceed to next onboarding step
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_2));
    navigation.navigate(Routes.REWARDS_ONBOARDING_1);
  }, [
    dispatch,
    navigation,
    optinAllowedForGeo,
    optinAllowedForGeoError,
    optinAllowedForGeoLoading,
    subscriptionId,
    showErrorModal,
    showRetryErrorModal,
    fetchGeoRewardsMetadata,
    internalAccount,
  ]);

  /**
   * Handles the skip button press
   */
  const handleSkip = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  /**
   * Auto-redirect to dashboard if user is already opted in
   */
  useFocusEffect(
    useCallback(() => {
      if (subscriptionId) {
        navigation.navigate(Routes.REWARDS_DASHBOARD);
      }
    }, [subscriptionId, navigation]),
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

  /**
   * Renders the main title section
   */
  const renderTitle = () => (
    <Box
      twClassName="gap-2"
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
    >
      <Box twClassName="justify-center items-center">
        <RNText
          style={[
            tw.style('text-center text-white text-12'),
            // eslint-disable-next-line react-native/no-inline-styles
            { fontFamily: 'MM Poly Regular', fontWeight: '400' },
          ]}
        >
          {strings('rewards.onboarding.intro_title_1')}
        </RNText>
        <RNText
          style={[
            tw.style('text-center text-white text-12'),
            // eslint-disable-next-line react-native/no-inline-styles
            { fontFamily: 'MM Poly Regular', fontWeight: '400' },
          ]}
        >
          {strings('rewards.onboarding.intro_title_2')}
        </RNText>
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        style={tw.style('text-center text-white')}
      >
        {strings('rewards.onboarding.intro_description')}
      </Text>
    </Box>
  );

  /**
   * Renders the intro image section
   */
  const renderImage = () => (
    <Box twClassName="flex-1 justify-center items-center py-2">
      <Image
        source={intro}
        resizeMode="contain"
        style={tw.style('w-full h-full max-w-lg max-h-lg')}
        testID="intro-image"
      />
    </Box>
  );

  /**
   * Renders the action buttons section
   */
  const renderActions = () => (
    <Box twClassName="gap-2 flex-col">
      <ButtonHero
        size={DSRNButtonSize.Lg}
        isLoading={optinAllowedForGeoLoading}
        isDisabled={
          optinAllowedForGeoLoading ||
          candidateSubscriptionIdError ||
          !!subscriptionId
        }
        loadingText={strings('rewards.onboarding.intro_confirm_geo_loading')}
        onPress={handleNext}
        twClassName="w-full bg-primary-default"
      >
        <Text twClassName="text-white">
          {strings('rewards.onboarding.intro_confirm')}
        </Text>
      </ButtonHero>
      <DSRNButton
        variant={ButtonVariant.Tertiary}
        size={DSRNButtonSize.Lg}
        isDisabled={candidateSubscriptionIdLoading || !!subscriptionId}
        onPress={handleSkip}
        twClassName="w-full bg-gray-500 border-gray-500"
      >
        <Text twClassName="text-white">
          {strings('rewards.onboarding.intro_skip')}
        </Text>
      </DSRNButton>
    </Box>
  );

  if (candidateSubscriptionIdLoading || !!subscriptionId) {
    return <Skeleton width="100%" height="100%" />;
  }

  return (
    <Box twClassName="min-h-full" testID="onboarding-intro-container">
      <ImageBackground
        source={introBg}
        style={tw.style('flex-grow px-4 py-8')}
        resizeMode="cover"
      >
        {/* Spacer */}
        <Box twClassName="flex-basis-[5%]" />

        {/* Title Section */}
        {renderTitle()}

        {/* Image Section */}
        {renderImage()}

        {/* Actions Section */}
        {renderActions()}
      </ImageBackground>
    </Box>
  );
};

export default OnboardingIntroStep;
