import React from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { setActiveStep } from '../../../../actions/rewardsOnboarding';
import { OnboardingStep } from '../../../../reducers/rewardsOnboarding/types';
import Routes from '../../../../constants/navigation/Routes';
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

const Onboarding2: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();

  const handleNext = () => {
    // Update Redux state to step 3
    dispatch(setActiveStep(OnboardingStep.STEP_3));
    navigation.navigate(Routes.REWARDS_ONBOARDING_3);
  };

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.WALLET.HOME }],
    });
  };

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
      <Box twClassName="flex-1 px-6 mt-[420px]">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center mb-3">
          Earn Points on Every Trade
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center text-alternative"
        >
          Turn your onchain activity into rewards. Every swap and perps trade in
          MetaMask earns you points.
        </Text>
      </Box>

      <Box twClassName="px-6 pb-10 gap-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleNext}
          twClassName="w-full"
        >
          Continue
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleSkip}
          twClassName="w-full"
        >
          Not now
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default Onboarding2;
