import React, { useCallback } from 'react';
import { ImageBackground, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
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
import { selectOptinAllowedForGeo } from '../../../../../reducers/rewards/selectors';
import { strings } from '../../../../../../locales/i18n';

const Onboarding1: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const optinAllowedForGeo = useSelector(selectOptinAllowedForGeo);

  const handleNext = useCallback(async () => {
    if (!optinAllowedForGeo) {
      navigation.navigate(Routes.MODAL.REWARDS_ERROR_MODAL, {
        title: strings('rewards.onboarding.region_not_supported_title'),
        description: strings(
          'rewards.onboarding.region_not_supported_description',
        ),
        dismissLabel: strings('rewards.onboarding.got_it'),
      });
      return;
    }
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_2));
    navigation.navigate(Routes.REWARDS_ONBOARDING_2);
  }, [dispatch, navigation, optinAllowedForGeo]);

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
              {strings('rewards.onboarding.season_one')}
            </Text>
            <Text
              variant={TextVariant.DisplayLg}
              twClassName="text-center mb-3 text-[68px] leading-1 text-white"
              // eslint-disable-next-line react-native/no-inline-styles
              style={{ fontFamily: 'MM Poly Regular' }}
            >
              {strings('rewards.onboarding.is_live')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-center text-white"
            >
              {strings('rewards.onboarding.earn_bonus_description')}
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
            {strings('rewards.onboarding.claim_points_now')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleSkip}
            twClassName="w-full bg-gray-500 border-gray-500"
          >
            <Text twClassName="text-white">
              {strings('rewards.onboarding.not_now')}
            </Text>
          </Button>
        </Box>
      </ImageBackground>
    </Box>
  );
};

export default Onboarding1;
