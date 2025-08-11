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
import rewardsOnboarding1 from '../../../../../images/rewards/rewards-onboarding-1.png';
import RewardsBg2 from '../../../../../images/rewards/rewards-bg-2.svg';
import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import { useTheme } from '../../../../../util/theme';

const Onboarding2: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { colors } = useTheme();

  const handleNext = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_3));
    navigation.navigate(Routes.REWARDS_ONBOARDING_3);
  }, [dispatch, navigation]);

  const handleSkip = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_1));
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
        <Box twClassName="w-7 h-2 rounded-md bg-text-default mx-1" />
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
        <Box twClassName="w-2 h-2 rounded-md bg-text-alternative mx-1" />
      </Box>
      <Box
        twClassName="w-full h-100 my-10 relative"
        justifyContent={BoxJustifyContent.Center}
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Column}
      >
        {/* Background layer */}
        <RewardsBg2
          name="rewards-bg-2"
          fill={colors.background.muted}
          style={tw.style('absolute inset-0 w-full h-full')}
        />
        {/* Foreground layer */}
        <Image
          source={rewardsOnboarding1}
          style={tw.style('flex-1 z-10')}
          resizeMode="contain"
        />
      </Box>

      <Box twClassName="flex-1 px-4">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center mb-3">
          Earn Points on Every Trade
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center text-alternative"
        >
          Every swap and perps trade in MetaMask earns you points. No sign-up,
          no extra steps.
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

export default Onboarding2;
