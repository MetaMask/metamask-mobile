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

const MARKETING_MOMENTS = [
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
];

/**
 * Temporary shortcuts for reviewing the marketing moment screens.
 */
const MarketingMomentsDeveloperOptionsSection = () => (
  <Box twClassName="mt-4 gap-2">
    <Text color={TextColor.TextDefault} variant={TextVariant.HeadingLg}>
      {'Marketing moments'}
    </Text>
    {MARKETING_MOMENTS.map(({ label, open }) => (
      <Button
        key={label}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={open}
      >
        {label}
      </Button>
    ))}
  </Box>
);

export default MarketingMomentsDeveloperOptionsSection;
