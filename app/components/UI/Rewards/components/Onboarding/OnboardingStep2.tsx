import React, { useCallback } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import step2Img from '../../../../../images/rewards/rewards-onboarding-step2.png';
import Step2BgImg from '../../../../../images/rewards/rewards-onboarding-step2-bg.svg';
import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStepComponent from './OnboardingStep';

const OnboardingStep2: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { colors } = useTheme();

  const handleNext = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_3));
    navigation.navigate(Routes.REWARDS_ONBOARDING_3);
  }, [dispatch, navigation]);

  const handlePrevious = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.INTRO));
    navigation.navigate(Routes.WALLET_VIEW);
  }, [dispatch, navigation]);

  const renderStepImage = () => (
    <>
      <Step2BgImg
        name="rewards-onboarding-step2-bg"
        fill={colors.background.muted}
        style={tw.style('absolute flex-1 w-full h-full')}
      />

      <Image
        source={step2Img}
        style={tw.style('flex-1 max-h-[75%] z-10')}
        testID="step-2-image"
        resizeMode="contain"
      />
    </>
  );

  const renderStepInfo = () => (
    <>
      <Text variant={TextVariant.HeadingLg} twClassName="text-center">
        {strings('rewards.onboarding.step2_title')}
      </Text>

      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-center text-alternative"
      >
        {strings('rewards.onboarding.step2_description')}
      </Text>
    </>
  );

  return (
    <OnboardingStepComponent
      currentStep={2}
      onNext={handleNext}
      onPrevious={handlePrevious}
      renderStepImage={renderStepImage}
      renderStepInfo={renderStepInfo}
    />
  );
};

export default OnboardingStep2;
