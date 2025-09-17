import React, { useCallback } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import Routes from '../../../../../constants/navigation/Routes';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import step1Img from '../../../../../images/rewards/rewards-onboarding-step1.png';
import Step1BgImg from '../../../../../images/rewards/rewards-onboarding-step1-bg.svg';
import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStepComponent from './OnboardingStep';

const OnboardingStep1: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { colors } = useTheme();

  const handleNext = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_2));
    navigation.navigate(Routes.REWARDS_ONBOARDING_2);
  }, [dispatch, navigation]);

  const handlePrevious = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.INTRO));
    navigation.navigate(Routes.REWARDS_ONBOARDING_INTRO);
  }, [dispatch, navigation]);

  const renderStepImage = () => (
    <>
      <Step1BgImg
        name="rewards-onboarding-step1-bg"
        fill={colors.background.muted}
        style={tw.style('absolute w-full h-full')}
      />

      <Image
        source={step1Img}
        style={tw.style('flex-1 max-h-[75%] z-10')}
        testID="step-1-image"
        resizeMode="contain"
      />
    </>
  );

  const renderStepInfo = () => (
    <>
      <Text variant={TextVariant.HeadingLg} twClassName="text-center">
        {strings('rewards.onboarding.step1_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-alternative"
      >
        {strings('rewards.onboarding.step1_description')}
      </Text>
    </>
  );

  return (
    <OnboardingStepComponent
      currentStep={1}
      onNext={handleNext}
      onPrevious={handlePrevious}
      renderStepImage={renderStepImage}
      renderStepInfo={renderStepInfo}
    />
  );
};

export default OnboardingStep1;
