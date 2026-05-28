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

interface ScreenJump {
  label: string;
  screen: string;
  params?: Record<string, unknown>;
}

// Main Card stack (routes/index.tsx → MainRoutes)
const MAIN_CARD_SCREENS: ScreenJump[] = [
  { label: 'CardHome', screen: Routes.CARD.HOME },
  { label: 'CardWelcome', screen: Routes.CARD.WELCOME },
  {
    label: 'ChooseYourCard (onboarding)',
    screen: Routes.CARD.CHOOSE_YOUR_CARD,
    params: { flow: 'onboarding' },
  },
  {
    label: 'ChooseYourCard (upgrade)',
    screen: Routes.CARD.CHOOSE_YOUR_CARD,
    params: { flow: 'upgrade' },
  },
  {
    label: 'ChooseYourCard (home)',
    screen: Routes.CARD.CHOOSE_YOUR_CARD,
    params: { flow: 'home' },
  },
  { label: 'ReviewOrder', screen: Routes.CARD.REVIEW_ORDER },
  { label: 'OrderCompleted', screen: Routes.CARD.ORDER_COMPLETED },
  { label: 'CardCashback', screen: Routes.CARD.CASHBACK },
  { label: 'CardAuthentication', screen: Routes.CARD.AUTHENTICATION },
  {
    label: 'CardSpendingLimit (manage)',
    screen: Routes.CARD.SPENDING_LIMIT,
    params: { flow: 'manage' },
  },
  {
    label: 'CardSpendingLimit (enable)',
    screen: Routes.CARD.SPENDING_LIMIT,
    params: { flow: 'enable' },
  },
  {
    label: 'CardSpendingLimit (onboarding)',
    screen: Routes.CARD.SPENDING_LIMIT,
    params: { flow: 'onboarding' },
  },
];

// Modals stack (routes/index.tsx → CardModalsRoutes)
const MODAL_SCREENS: ScreenJump[] = [
  { label: 'AddFunds', screen: Routes.CARD.MODALS.ADD_FUNDS },
  { label: 'AssetSelection', screen: Routes.CARD.MODALS.ASSET_SELECTION },
  { label: 'RegionSelection', screen: Routes.CARD.MODALS.REGION_SELECTION },
  {
    label: 'ConfirmModal',
    screen: Routes.CARD.MODALS.CONFIRM_MODAL,
    params: {
      title: 'Dev confirm title',
      message: 'Dev confirm message',
      confirmButtonLabel: 'Confirm',
      cancelButtonLabel: 'Cancel',
    },
  },
  { label: 'Password', screen: Routes.CARD.MODALS.PASSWORD },
  { label: 'RecurringFee', screen: Routes.CARD.MODALS.RECURRING_FEE },
  {
    label: 'DaimoPay',
    screen: Routes.CARD.MODALS.DAIMO_PAY,
    params: { payId: 'dev-pay-id' },
  },
  { label: 'ViewPin', screen: Routes.CARD.MODALS.VIEW_PIN },
  {
    label: 'SpendingLimitOptions',
    screen: Routes.CARD.MODALS.SPENDING_LIMIT_OPTIONS,
  },
  {
    label: 'WaitlistForm',
    screen: Routes.CARD.MODALS.WAITLIST_FORM,
    params: { url: 'https://example.com/waitlist' },
  },
];

const CardNavigatorDevPanel = () => {
  const navigation = useNavigation();

  const jumpToMainCardScreen = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: { screen, params },
      });
    },
    [navigation],
  );

  const jumpToModal = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.MODALS.ID,
        params: { screen, params },
      });
    },
    [navigation],
  );

  const renderButtonGroup = (
    items: ScreenJump[],
    onPress: (screen: string, params?: Record<string, unknown>) => void,
  ) => (
    <Box twClassName="mt-2 gap-2">
      {items.map(({ label, screen, params }) => (
        <Button
          key={label}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          isFullWidth
          onPress={() => onPress(screen, params)}
        >
          {label}
        </Button>
      ))}
    </Box>
  );

  return (
    <Box twClassName="mt-6 gap-2">
      <Text color={TextColor.Default} variant={TextVariant.HeadingLG}>
        Card Navigator (dev)
      </Text>

      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
        Jump to screens in routes/index.tsx (MainRoutes + CardModalsRoutes).
        Focus on header and navigation chrome; content may be empty without SDK
        setup.
      </Text>

      <Box twClassName="mt-4">
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          Main routes
        </Text>
      </Box>
      {renderButtonGroup(MAIN_CARD_SCREENS, jumpToMainCardScreen)}

      <Box twClassName="mt-4">
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          Modals (stubbed params where required)
        </Text>
      </Box>
      {renderButtonGroup(MODAL_SCREENS, jumpToModal)}
    </Box>
  );
};

export default CardNavigatorDevPanel;
