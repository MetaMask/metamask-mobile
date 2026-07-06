import React, { useCallback, useContext, useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
  Spinner,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useAppThemeFromContext } from '../../../util/theme';
import type { Theme } from '../../../util/theme/models';
import Button, { ButtonVariants } from '../Buttons/Button';
import { IconName } from '../Icons/Icon';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_APP_ICON_SOURCE,
  TEST_AVATAR_TYPE,
  TEST_NETWORK_IMAGE_SOURCE,
  TEST_NETWORK_NAME,
} from './Toast.constants';
import { ButtonIconVariant, ToastOptions, ToastVariants } from './Toast.types';
import {
  presentStoryToast,
  STORYBOOK_TOAST_OPTIONS,
  StoryContainer,
  StoryToastHost,
} from './ToastStory.shared';

interface ToastTrigger {
  label: string;
  getOptions: (theme: Theme) => ToastOptions;
}

interface ToastTriggerSection {
  title: string;
  triggers: ToastTrigger[];
}

const getPlainTriggers = (): ToastTrigger[] => [
  {
    label: 'Plain',
    getOptions: () => ({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      labelOptions: [{ label: 'This is a plain toast message.' }],
    }),
  },
  {
    label: 'Plain with description',
    getOptions: () => ({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      labelOptions: [{ label: 'Transaction submitted', isBold: true }],
      descriptionOptions: {
        description: 'Your swap is being processed on Ethereum Mainnet.',
      },
    }),
  },
  {
    label: 'Plain with bold labels',
    getOptions: () => ({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      labelOptions: [
        { label: 'Switching to' },
        { label: ' Account 2', isBold: true },
        { label: '.' },
      ],
    }),
  },
];

const getAccountTriggers = (): ToastTrigger[] => [
  {
    label: 'Account',
    getOptions: () => ({
      variant: ToastVariants.Account,
      hasNoTimeout: true,
      labelOptions: [
        { label: 'Switching to' },
        { label: ' Account 2', isBold: true },
      ],
      accountAddress: TEST_ACCOUNT_ADDRESS,
      accountAvatarType: TEST_AVATAR_TYPE,
    }),
  },
];

const getNetworkTriggers = (): ToastTrigger[] => [
  {
    label: 'Network',
    getOptions: () => ({
      variant: ToastVariants.Network,
      hasNoTimeout: true,
      networkName: TEST_NETWORK_NAME,
      networkImageSource: TEST_NETWORK_IMAGE_SOURCE,
      labelOptions: [
        { label: 'Added' },
        { label: ` ${TEST_NETWORK_NAME}`, isBold: true },
        { label: ' network.' },
      ],
    }),
  },
  {
    label: 'Network with link',
    getOptions: () => ({
      variant: ToastVariants.Network,
      hasNoTimeout: true,
      networkName: TEST_NETWORK_NAME,
      networkImageSource: TEST_NETWORK_IMAGE_SOURCE,
      labelOptions: [
        { label: 'Added' },
        { label: ` ${TEST_NETWORK_NAME}`, isBold: true },
        { label: ' network.' },
      ],
      descriptionOptions: {
        description: 'This network was added to your wallet.',
      },
      linkButtonOptions: {
        label: 'View network',
        onPress: () => Alert.alert('Network link pressed'),
      },
    }),
  },
];

const getAppTriggers = (): ToastTrigger[] => [
  {
    label: 'App',
    getOptions: () => ({
      variant: ToastVariants.App,
      hasNoTimeout: true,
      appIconSource: TEST_APP_ICON_SOURCE,
      labelOptions: [{ label: 'Returning to Uniswap', isBold: true }],
      descriptionOptions: {
        description: 'Tap to open the dapp again.',
      },
    }),
  },
];

const getIconTriggers = (theme: Theme): ToastTrigger[] => [
  {
    label: 'Icon success',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.CheckBold,
      iconColor: theme.colors.accent03.dark,
      backgroundColor: theme.colors.accent03.normal,
      labelOptions: [
        { label: 'Order placed', isBold: true },
        { label: '\n', isBold: false },
        { label: 'Your market order was submitted.', isBold: false },
      ],
    }),
  },
  {
    label: 'Icon loading',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Loading,
      iconColor: theme.colors.accent04.dark,
      backgroundColor: theme.colors.accent04.normal,
      labelOptions: [
        { label: 'Deposit in progress', isBold: true },
        { label: '\n', isBold: false },
        { label: 'This may take a few minutes.', isBold: false },
      ],
      startAccessory: (
        <Box twClassName="pr-3">
          <Spinner
            color={ReactNativeDsIconColor.PrimaryDefault}
            spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
          />
        </Box>
      ),
    }),
  },
  {
    label: 'Icon error',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Warning,
      iconColor: theme.colors.accent01.dark,
      backgroundColor: theme.colors.accent01.light,
      labelOptions: [
        { label: 'Transaction failed', isBold: true },
        { label: '\n', isBold: false },
        { label: 'Please try again.', isBold: false },
      ],
    }),
  },
  {
    label: 'Icon warning',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Warning,
      iconColor: theme.colors.warning.default,
      backgroundColor: theme.colors.warning.muted,
      labelOptions: [
        { label: 'Taking longer than expected', isBold: true },
        { label: '\n', isBold: false },
        { label: 'Your transaction is still pending.', isBold: false },
      ],
    }),
  },
  {
    label: 'Icon info',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Info,
      iconColor: theme.colors.icon.default,
      backgroundColor: theme.colors.background.alternative,
      labelOptions: [
        { label: 'Network switched', isBold: true },
        { label: '\n', isBold: false },
        { label: 'You are now connected to Linea.', isBold: false },
      ],
    }),
  },
];

const getCloseActionTriggers = (): ToastTrigger[] => [
  {
    label: 'With close link button',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.CheckBold,
      labelOptions: [
        { label: 'Deposit complete', isBold: true },
        { label: '\n', isBold: false },
        { label: '100 USDC added to your account.', isBold: false },
      ],
      closeButtonOptions: {
        label: 'Track',
        variant: ButtonVariants.Link,
        onPress: () => Alert.alert('Track pressed'),
      },
    }),
  },
  {
    label: 'With close icon button',
    getOptions: () => ({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      labelOptions: [{ label: 'Notification with dismiss icon.' }],
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconName.Close,
        onPress: () => Alert.alert('Close pressed'),
      },
    }),
  },
  {
    label: 'With primary close button',
    getOptions: () => ({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      labelOptions: [{ label: 'Action required' }],
      descriptionOptions: {
        description: 'Confirm the transaction in your wallet.',
      },
      closeButtonOptions: {
        label: 'Review',
        variant: ButtonVariants.Primary,
        onPress: () => Alert.alert('Review pressed'),
      },
    }),
  },
  {
    label: 'With custom top offset',
    getOptions: () => ({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      customTopOffset: 24,
      labelOptions: [{ label: 'Toast with extra top offset.' }],
    }),
  },
];

const getStorySections = (theme: Theme): ToastTriggerSection[] => [
  { title: 'Plain', triggers: getPlainTriggers() },
  { title: 'Account', triggers: getAccountTriggers() },
  { title: 'Network', triggers: getNetworkTriggers() },
  { title: 'App', triggers: getAppTriggers() },
  { title: 'Icon', triggers: getIconTriggers(theme) },
  { title: 'Close / action', triggers: getCloseActionTriggers() },
];

const ToastTriggerStoryContent = () => {
  const tw = useTailwind();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const sections = useMemo(() => getStorySections(theme), [theme]);

  const showToast = useCallback(
    (trigger: ToastTrigger) => {
      presentStoryToast(toastRef, {
        ...STORYBOOK_TOAST_OPTIONS,
        ...trigger.getOptions(theme),
      });
    },
    [theme, toastRef],
  );

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 p-4 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section) => (
          <View key={section.title} style={tw.style('gap-2')}>
            <Text variant={TextVariant.HeadingSm}>{section.title}</Text>
            {section.triggers.map((trigger) => (
              <Button
                key={trigger.label}
                variant={ButtonVariants.Secondary}
                label={trigger.label}
                onPress={() => showToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const ToastTriggerStory = () => (
  <ToastContextWrapper>
    <ToastTriggerStoryContent />
  </ToastContextWrapper>
);

const ToastMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default ToastMeta;

export const Default = {
  render: () => <ToastTriggerStory />,
};
