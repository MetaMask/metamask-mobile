import React, { useCallback } from 'react';
import { Image, ImageBackground, Text as RNText } from 'react-native';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

import { Skeleton } from '../../../../../component-library/components/Skeleton';

import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import Routes from '../../../../../constants/navigation/Routes';
import introBg from '../../../../../images/rewards/rewards-onboarding-intro-bg.png';
import intro from '../../../../../images/rewards/rewards-onboarding-intro.png';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import {
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
  selectCandidateSubscriptionId,
} from '../../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../../selectors/rewards';
import { strings } from '../../../../../../locales/i18n';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';

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
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  // Computed state
  const candidateSubscriptionIdLoading =
    !subscriptionId && candidateSubscriptionId === 'pending';

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
  }, [dispatch, navigation, optinAllowedForGeo, showErrorModal]);

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
        size={ButtonSize.Lg}
        isLoading={optinAllowedForGeoLoading}
        loadingText={strings('rewards.onboarding.intro_confirm_geo_loading')}
        onPress={handleNext}
        twClassName="w-full bg-primary-default"
      >
        <Text twClassName="text-white">
          {strings('rewards.onboarding.intro_confirm')}
        </Text>
      </ButtonHero>
      <Button
        variant={ButtonVariant.Tertiary}
        size={ButtonSize.Lg}
        isDisabled={candidateSubscriptionIdLoading || !!subscriptionId}
        onPress={handleSkip}
        twClassName="w-full bg-gray-500 border-gray-500"
      >
        <Text twClassName="text-white">
          {strings('rewards.onboarding.intro_skip')}
        </Text>
      </Button>
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
