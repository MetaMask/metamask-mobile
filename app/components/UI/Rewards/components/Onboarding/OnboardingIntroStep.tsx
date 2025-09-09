import React, { useCallback } from 'react';
import { ImageBackground, Image } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { OnboardingStep } from '../../../../../reducers/rewards/types';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import introBg from '../../../../../images/rewards/rewards-onboarding-intro-bg.png';
import intro from '../../../../../images/rewards/rewards-onboarding-intro.png';
import { setOnboardingActiveStep } from '../../../../../actions/rewards';
import {
  selectOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading,
} from '../../../../../reducers/rewards/selectors';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { isSolanaAccount } from '../../../../../core/Multichain/utils';
import { strings } from '../../../../../../locales/i18n';

const OnboardingIntroStep: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const optinAllowedForGeo = useSelector(selectOptinAllowedForGeo);
  const optinAllowedForGeoLoading = useSelector(
    selectOptinAllowedForGeoLoading,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const handleNext = useCallback(async () => {
    if (selectedAccount && isSolanaAccount(selectedAccount)) {
      navigation.navigate(Routes.MODAL.REWARDS_ERROR_MODAL, {
        title: strings('rewards.onboarding.not_supported_account_needed_title'),
        description: strings(
          'rewards.onboarding.not_supported_account_needed_description',
        ),
        dismissLabel: strings('rewards.onboarding.not_supported_confirm'),
      });
      return;
    }

    if (!optinAllowedForGeo) {
      navigation.navigate(Routes.MODAL.REWARDS_ERROR_MODAL, {
        title: strings('rewards.onboarding.not_supported_region_title'),
        description: strings(
          'rewards.onboarding.not_supported_region_description',
        ),
        dismissLabel: strings('rewards.onboarding.not_supported_confirm'),
      });
      return;
    }
    dispatch(setOnboardingActiveStep(OnboardingStep.STEP_2));
    navigation.navigate(Routes.REWARDS_ONBOARDING_1);
  }, [dispatch, navigation, optinAllowedForGeo, selectedAccount]);

  const handleSkip = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <Box twClassName="flex-grow min-h-full" testID="onboarding-intro-container">
      <ImageBackground
        source={introBg}
        style={tw.style('flex-1 px-4 py-8')}
        resizeMode="cover"
      >
        <Box twClassName="flex-basis-[75px]" />

        <Box
          twClassName="gap-2"
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
        >
          <Box twClassName="justify-center items-center gap-1">
            <Text
              variant={TextVariant.DisplayLg}
              style={tw.style('text-center text-white text-[44px]', {
                fontFamily: 'MM Poly Regular',
              })}
            >
              {strings('rewards.onboarding.intro_title_1')}
            </Text>

            <Text
              variant={TextVariant.DisplayLg}
              style={tw.style('text-center text-white leading-1 text-[60px]', {
                fontFamily: 'MM Poly Regular',
              })}
            >
              {strings('rewards.onboarding.intro_title_2')}
            </Text>
          </Box>

          <Text
            variant={TextVariant.BodyMd}
            style={tw.style('text-center text-white')}
          >
            {strings('rewards.onboarding.intro_description')}
          </Text>
        </Box>

        <Box twClassName="flex-1 justify-center items-center">
          <Image
            source={intro}
            resizeMode="contain"
            style={tw.style('w-full h-full max-w-lg max-h-lg')}
            testID="intro-image"
          />
        </Box>

        <Box twClassName="gap-2 flex-col">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isLoading={optinAllowedForGeoLoading}
            loadingText={strings(
              'rewards.onboarding.intro_confirm_geo_loading',
            )}
            onPress={handleNext}
            twClassName="w-full bg-primary-default"
          >
            {strings('rewards.onboarding.intro_confirm')}
          </Button>
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Lg}
            onPress={handleSkip}
            twClassName="w-full bg-gray-500 border-gray-500"
          >
            <Text twClassName="text-white">
              {strings('rewards.onboarding.intro_skip')}
            </Text>
          </Button>
        </Box>
      </ImageBackground>
    </Box>
  );
};

export default OnboardingIntroStep;
