import React, { useCallback } from 'react';
import { Image, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import Routes from '../../../../../constants/navigation/Routes';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import step3Img from '../../../../../images/rewards/rewards-onboarding-step3.png';
import Step3BgImg from '../../../../../images/rewards/rewards-onboarding-step3-bg.svg';
import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStepComponent from './OnboardingStep';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';

const OnboardingStep3: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const handleNext = useCallback(async () => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_4));
    navigation.navigate(Routes.REWARDS_ONBOARDING_4);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.REWARDS_ONBOARDING_COMPLETED,
      ).build(),
    );
  }, [dispatch, navigation, trackEvent, createEventBuilder]);

  const handleSkip = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_4));
    navigation.navigate(Routes.REWARDS_ONBOARDING_4);
  }, [dispatch, navigation]);

  const renderStepImage = () => (
    <>
      <Step3BgImg
        name="rewards-onboarding-step3-bg"
        fill={colors.background.muted}
        style={tw.style('absolute w-full h-full')}
        width={screenWidth}
        height={screenHeight}
      />

      <Image
        source={step3Img}
        style={tw.style('h-80 z-10')}
        testID="step-3-image"
        resizeMode="contain"
      />
    </>
  );

  const renderStepInfo = () => (
    <Box twClassName="flex-col gap-2 min-h-30">
      <Text variant={TextVariant.HeadingLg} twClassName="text-center">
        {strings('rewards.onboarding.step3_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-alternative"
      >
        {strings('rewards.onboarding.step3_description')}
      </Text>
    </Box>
  );

  return (
    <OnboardingStepComponent
      currentStep={3}
      onNext={handleNext}
      onSkip={handleSkip}
      renderStepImage={renderStepImage}
      renderStepInfo={renderStepInfo}
    />
  );
};

export default OnboardingStep3;
