import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';

export const PROFILE_ONBOARDING_MARKETING_MOMENT_TEST_ID =
  'marketing-moment-profile-onboarding';

const MARKETING_MOMENTS: {
  label: string;
  testID?: string;
  open: () => void;
}[] = [
  {
    label: 'Card welcome',
    open: () =>
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { screen: Routes.CARD.WELCOME },
      }),
  },
  {
    label: 'Card order completed',
    open: () =>
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { screen: Routes.CARD.ORDER_COMPLETED },
      }),
  },
  {
    label: 'Card onboarding complete',
    open: () =>
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.ONBOARDING.ROOT,
          params: { screen: Routes.CARD.ONBOARDING.COMPLETE },
        },
      }),
  },
  {
    label: 'Perps go-to-market',
    open: () =>
      NavigationService.navigation?.navigate(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.GTM_MODAL,
      }),
  },
  {
    label: 'mUSD education',
    open: () =>
      NavigationService.navigation?.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
      }),
  },
  {
    label: 'VIP splash',
    open: () =>
      NavigationService.navigation?.navigate(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_VIP_SPLASH_VIEW,
        params: { preview: true },
      }),
  },
  {
    label: 'VIP referee splash',
    open: () =>
      NavigationService.navigation?.navigate(Routes.REWARDS_FLOW, {
        screen: Routes.REWARDS_VIP_REFEREE_SPLASH_VIEW,
        params: { preview: true },
      }),
  },
  {
    label: 'Profile onboarding',
    testID: PROFILE_ONBOARDING_MARKETING_MOMENT_TEST_ID,
    open: () =>
      NavigationService.navigation?.navigate(Routes.SOCIAL.PROFILE_ONBOARDING),
  },
];

/**
 * Temporary shortcuts for reviewing the marketing moment screens.
 */
const MarketingMomentsDeveloperOptionsSection = () => (
  <Box twClassName="mt-4 gap-2">
    <Text color={TextColor.TextDefault} variant={TextVariant.HeadingLg}>
      {'Marketing moments'}
    </Text>
    {MARKETING_MOMENTS.map(({ label, open, testID }) => (
      <Button
        key={label}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={open}
        testID={testID}
      >
        {label}
      </Button>
    ))}
  </Box>
);

export default MarketingMomentsDeveloperOptionsSection;
