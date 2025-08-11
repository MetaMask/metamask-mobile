import React, { useCallback } from 'react';
import { SafeAreaView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import Routes from '../../../../../constants/navigation/Routes';
import {
  Box,
  Text,
  Button,
  ButtonIcon,
  TextVariant,
  ButtonSize,
  ButtonVariant,
  ButtonIconSize,
  IconName,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import rewardsOnboarding3 from '../../../../../images/rewards/rewards-onboarding-3.png';
import RewardsBg3 from '../../../../../images/rewards/rewards-bg-3.svg';
import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import { useTheme } from '../../../../../util/theme';

const Onboarding4: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { colors } = useTheme();

  const handleNext = useCallback(async () => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_5));
    navigation.navigate(Routes.REWARDS_ONBOARDING_5);
  }, [dispatch, navigation]);

  const handleSkip = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_3));
    navigation.goBack();
  }, [dispatch, navigation]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.ArrowLeft}
        onPress={handleSkip}
        style={tw.style('absolute top-4 left-4 z-10')}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Center}
        alignItems={BoxAlignItems.Center}
        twClassName="mt-8"
      >
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
        <Box twClassName="w-7 h-2 rounded-md bg-text-default mx-1" />
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
      </Box>
      <Box
        twClassName="w-full h-100 my-10 relative"
        justifyContent={BoxJustifyContent.Center}
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Column}
      >
        {/* Background layer */}
        <RewardsBg3
          name="rewards-bg-3"
          fill={colors.background.muted}
          style={tw.style('absolute inset-0 w-full h-full')}
        />
        {/* Foreground layer */}
        <Image source={rewardsOnboarding3} style={tw.style('flex-1 z-10')} />
      </Box>
      <Box twClassName="flex-1 px-4">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center mb-3">
          Exclusive Seasonal Rewards
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center text-alternative"
        >
          Each season brings new perks. Join in, compete, and claim what you can
          before time runs out.
        </Text>
      </Box>

      <Box twClassName="p-4 gap-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleNext}
          twClassName="w-full"
        >
          Continue
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default Onboarding4;
