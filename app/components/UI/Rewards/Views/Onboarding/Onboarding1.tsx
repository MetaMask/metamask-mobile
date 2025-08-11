import React, { useCallback } from 'react';
import { ImageBackground, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import {
  Box,
  Text,
  Button,
  TextVariant,
  ButtonSize,
  ButtonVariant,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import rewardsBg1 from '../../../../../images/rewards/rewards-bg-1.png';
import rewards1 from '../../../../../images/rewards/rewards-1.png';
import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import { useRewardsStore } from '../../hooks';

const Onboarding1: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const { isBlocked } = useRewardsStore();

  const handleNext = useCallback(async () => {
    if (isBlocked) {
      navigation.navigate(Routes.MODAL.REWARDS_ERROR_MODAL, {
        title: 'Region not supported',
        description:
          'Rewards are not supported in your region yet. We are working on expanding access, so check back later.',
        dismissLabel: 'Got it',
      });
      return;
    }
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_2));
    navigation.navigate(Routes.REWARDS_ONBOARDING_2);
  }, [dispatch, navigation, isBlocked]);

  const handleSkip = useCallback(() => {
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_1));
    navigation.goBack();
  }, [dispatch, navigation]);

  return (
    <Box twClassName="flex-grow min-h-full">
      <ImageBackground
        source={rewardsBg1}
        style={tw.style('flex-1')}
        resizeMode="cover"
      >
        <Box twClassName="flex-1 px-6 mt-20">
          <Box alignItems={BoxAlignItems.Start} twClassName="mb-10">
            <Text
              variant={TextVariant.DisplayLg}
              twClassName="text-center text-[50px] leading-1 text-white"
              // eslint-disable-next-line react-native/no-inline-styles
              style={{ fontFamily: 'MM Poly Regular' }}
            >
              Season 1
            </Text>
            <Text
              variant={TextVariant.DisplayLg}
              twClassName="text-center mb-3 text-[68px] leading-1 text-white"
              // eslint-disable-next-line react-native/no-inline-styles
              style={{ fontFamily: 'MM Poly Regular' }}
            >
              is Live
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-center text-white"
            >
              Earn bonus points and perks based on your MetaMask activity,
              unlock rewards, and advance through the levels
            </Text>
          </Box>
          <Image source={rewards1} style={tw.style('flex-1')} />
        </Box>

        <Box twClassName="px-4 pb-10 gap-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleNext}
            twClassName="w-full bg-primary-default"
          >
            Claim 250 points now
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleSkip}
            twClassName="w-full bg-gray-500 border-gray-500"
          >
            <Text twClassName="text-white">Not now</Text>
          </Button>
        </Box>
      </ImageBackground>
    </Box>
  );
};

export default Onboarding1;
