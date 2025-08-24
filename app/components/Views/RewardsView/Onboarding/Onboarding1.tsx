import React from 'react';
import { SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../constants/navigation/Routes';
import StorageWrapper from '../../../../store/storage-wrapper';
import { setActiveStep } from '../../../../actions/rewardsOnboarding';
import { OnboardingStep } from '../../../../reducers/rewardsOnboarding/types';
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
} from '@metamask/design-system-react-native';
import { REWARDS_ONBOARDING_COMPLETED_KEY } from '../../../../util/rewards';

const Onboarding1: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();

  const handleNext = async () => {
    // Check if onboarding was already completed
    const isCompleted = await StorageWrapper.getItem(
      REWARDS_ONBOARDING_COMPLETED_KEY,
    );

    if (isCompleted === 'true') {
      // Jump directly to step 5 if already completed
      dispatch(setActiveStep(OnboardingStep.STEP_5));
      navigation.navigate(Routes.REWARDS_ONBOARDING_5);
    } else {
      // Normal flow - move to step 2
      dispatch(setActiveStep(OnboardingStep.STEP_2));
      navigation.navigate(Routes.REWARDS_ONBOARDING_2);
    }
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ButtonIcon
        size={ButtonIconSize.Lg}
        iconName={IconName.Close}
        onPress={handleSkip}
        style={tw.style('absolute top-4 left-4 z-10')}
      />
      <Box twClassName="flex-1 px-6 mt-20">
        <Box alignItems={BoxAlignItems.Center} twClassName="mb-10">
          <Text
            variant={TextVariant.DisplayLg}
            twClassName="text-center mb-3"
            style={tw.style('font-[MM_Poly]')}
          >
            Season 1 is Live
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="text-center">
            Earn bonus points and perks based on your MetaMask activity, unlock
            rewards, and advance through the levels
          </Text>
        </Box>
      </Box>

      <Box twClassName="px-6 pb-10 w-full">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleNext}
          twClassName="w-full"
        >
          Claim 250 points now
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default Onboarding1;
