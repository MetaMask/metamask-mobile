import React, { useCallback, useEffect } from 'react';
import { Image, ImageBackground, Text as RNText } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import Routes from '../../../../../constants/navigation/Routes';
import { isSolanaAccount } from '../../../../../core/Multichain/utils';
import introBg from '../../../../../images/rewards/rewards-onboarding-intro-bg.png';
import intro from '../../../../../images/rewards/rewards-onboarding-intro.png';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import {
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
} from '../../../../../reducers/rewards/selectors';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { strings } from '../../../../../../locales/i18n';

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
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  // Computed state
  const subscriptionIdLoading = subscriptionId === 'pending';
  const subscriptionIdValid =
    Boolean(subscriptionId) &&
    subscriptionId !== 'error' &&
    subscriptionId !== 'pending';

  const isLoading =
    optinAllowedForGeoLoading || subscriptionIdLoading || subscriptionIdValid;

  /**
   * Shows error modal for unsupported scenarios
   */
  const showErrorModal = useCallback(
    (titleKey: string, descriptionKey: string) => {
      navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
        title: strings(titleKey),
        description: strings(descriptionKey),
        confirmAction: {
          label: strings('rewards.onboarding.not_supported_confirm'),
          // eslint-disable-next-line no-empty-function
          onPress: () => {},
          variant: ButtonVariant.Primary,
        },
      });
    },
    [navigation],
  );

  /**
   * Handles the confirm/continue button press
   */
  const handleNext = useCallback(async () => {
    // Prevent action if still loading
    if (isLoading) {
      return;
    }

    // Check for Solana account (not supported)
    if (selectedAccount && isSolanaAccount(selectedAccount)) {
      showErrorModal(
        'rewards.onboarding.not_supported_account_needed_title',
        'rewards.onboarding.not_supported_account_needed_description',
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

    // Proceed to next onboarding step
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_2));
    navigation.navigate(Routes.REWARDS_ONBOARDING_1);
  }, [
    dispatch,
    isLoading,
    navigation,
    optinAllowedForGeo,
    selectedAccount,
    showErrorModal,
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
  useEffect(() => {
    if (subscriptionIdValid) {
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    }
  }, [subscriptionIdValid, navigation]);

  /**
   * Gets the appropriate loading text based on current state
   */
  const getLoadingText = useCallback(() => {
    if (subscriptionIdLoading) {
      return strings('rewards.onboarding.checking_opt_in');
    }
    if (subscriptionIdValid) {
      return strings('rewards.onboarding.redirecting_to_dashboard');
    }
    return strings('rewards.onboarding.intro_confirm_geo_loading');
  }, [subscriptionIdLoading, subscriptionIdValid]);

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
    <Box twClassName="flex-1 justify-center items-center">
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
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isLoading={isLoading}
        loadingText={getLoadingText()}
        onPress={handleNext}
        twClassName="w-full bg-primary-default"
      >
        {strings('rewards.onboarding.intro_confirm')}
      </Button>
      <Button
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Lg}
        isDisabled={subscriptionIdLoading || subscriptionIdValid}
        onPress={handleSkip}
        twClassName="w-full bg-gray-500 border-gray-500"
      >
        <Text twClassName="text-white">
          {strings('rewards.onboarding.intro_skip')}
        </Text>
      </Button>
    </Box>
  );

  return (
    <Box twClassName="flex-grow min-h-full" testID="onboarding-intro-container">
      <ImageBackground
        source={introBg}
        style={tw.style('flex-1 p-4')}
        resizeMode="cover"
      >
        {/* Spacer */}
        <Box twClassName="flex-basis-[75px]" />

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
