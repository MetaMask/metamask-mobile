import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { CardUserPhase } from '../../types';

const ONBOARDING_SCREENS: { label: string; screen: string }[] = [
  { label: 'SignUp', screen: Routes.CARD.ONBOARDING.SIGN_UP },
  { label: 'ConfirmEmail', screen: Routes.CARD.ONBOARDING.CONFIRM_EMAIL },
  { label: 'SetPhoneNumber', screen: Routes.CARD.ONBOARDING.SET_PHONE_NUMBER },
  {
    label: 'ConfirmPhoneNumber',
    screen: Routes.CARD.ONBOARDING.CONFIRM_PHONE_NUMBER,
  },
  { label: 'VerifyIdentity', screen: Routes.CARD.ONBOARDING.VERIFY_IDENTITY },
  {
    label: 'VerifyingVeriffKYC',
    screen: Routes.CARD.ONBOARDING.VERIFYING_VERIFF_KYC,
  },
  { label: 'PersonalDetails', screen: Routes.CARD.ONBOARDING.PERSONAL_DETAILS },
  { label: 'PhysicalAddress', screen: Routes.CARD.ONBOARDING.PHYSICAL_ADDRESS },
  { label: 'Complete', screen: Routes.CARD.ONBOARDING.COMPLETE },
  { label: 'KYCFailed', screen: Routes.CARD.ONBOARDING.KYC_FAILED },
  { label: 'KYCPending', screen: Routes.CARD.ONBOARDING.KYC_PENDING },
];

const USER_PHASES: { label: string; phase: CardUserPhase }[] = [
  { label: 'ACCOUNT', phase: 'ACCOUNT' },
  { label: 'PHONE_NUMBER', phase: 'PHONE_NUMBER' },
  { label: 'PERSONAL_INFORMATION', phase: 'PERSONAL_INFORMATION' },
  { label: 'PHYSICAL_ADDRESS', phase: 'PHYSICAL_ADDRESS' },
];

const CardNavigatorDevPanel = () => {
  const navigation = useNavigation();

  const jumpToOnboardingScreen = useCallback(
    (screen: string) => {
      navigation.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.ONBOARDING.ROOT,
          params: { screen },
        },
      });
    },
    [navigation],
  );

  const enterOnboardingWithPhase = useCallback(
    (cardUserPhase: CardUserPhase) => {
      navigation.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.ONBOARDING.ROOT,
          params: { cardUserPhase },
        },
      });
    },
    [navigation],
  );

  return (
    <Box twClassName="mt-6 gap-2">
      <Text color={TextColor.Default} variant={TextVariant.HeadingLG}>
        Card Navigator (dev)
      </Text>

      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
        Jump directly to an Onboarding screen. Use this to verify header,
        gesture, and exit-confirmation behaviour before/after the native-stack
        migration. Inner screens may render in error states without SDK setup —
        focus on header/back/swipe behaviour.
      </Text>

      <Box twClassName="mt-2 gap-2">
        {ONBOARDING_SCREENS.map(({ label, screen }) => (
          <Button
            key={screen}
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            isFullWidth
            onPress={() => jumpToOnboardingScreen(screen)}
          >
            {label}
          </Button>
        ))}
      </Box>

      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        twClassName="mt-4"
      >
        Enter OnboardingNavigator with a cardUserPhase param. This exercises the
        initialRouteName derivation in OnboardingNavigator (without overriding
        via screen).
      </Text>

      <Box twClassName="mt-2 gap-2">
        {USER_PHASES.map(({ label, phase }) => (
          <Button
            key={phase}
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Md}
            isFullWidth
            onPress={() => enterOnboardingWithPhase(phase)}
          >
            {label}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default CardNavigatorDevPanel;
