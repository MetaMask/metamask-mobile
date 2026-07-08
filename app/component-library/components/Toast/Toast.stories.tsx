import React, { useCallback, useContext, useMemo, type RefObject } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import {
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
import { IconColor, IconName } from '../Icons/Icon';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import {
  ButtonIconVariant,
  ToastOptions,
  ToastRef,
  ToastVariants,
} from './Toast.types';
import { visibilityDuration } from './Toast.constants';

const STORYBOOK_TOAST_OPTIONS: Pick<ToastOptions, 'hasNoTimeout'> = {
  hasNoTimeout: true,
};

const presentStoryToast = (
  toastRef: RefObject<ToastRef | null> | undefined,
  options: ToastOptions,
) => {
  toastRef?.current?.showToast({
    ...STORYBOOK_TOAST_OPTIONS,
    ...options,
  });
};

const StoryContainer = ({ children }: { children: React.ReactNode }) => {
  const tw = useTailwind();

  return (
    <View style={tw.style('relative min-h-full w-full flex-1 bg-default')}>
      {children}
    </View>
  );
};

const StoryToastHost = ({
  toastRef,
}: {
  toastRef: RefObject<ToastRef | null> | undefined;
}) => {
  const tw = useTailwind();

  return (
    <View
      pointerEvents="box-none"
      style={tw.style('absolute inset-x-0 top-0 z-50')}
    >
      <Toast ref={toastRef} />
    </View>
  );
};

interface ToastTrigger {
  label: string;
  getOptions: (theme: Theme) => ToastOptions;
}

interface ToastTriggerSection {
  title: string;
  triggers: ToastTrigger[];
}

const autoDismissToastOptions = (): ToastOptions => ({
  variant: ToastVariants.Plain,
  hasNoTimeout: false,
  labelOptions: [{ label: 'This toast dismisses automatically.' }],
  descriptionOptions: {
    description: `Visible for ${visibilityDuration / 1000}s, then animates away.`,
  },
});

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

const getAutodismissTriggers = (): ToastTrigger[] => [
  {
    label: 'Auto dismiss',
    getOptions: () => autoDismissToastOptions(),
  },
];

const getIconTriggers = (): ToastTrigger[] => [
  {
    label: 'Icon success',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Confirmation,
      iconColor: IconColor.Success,
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
      iconColor: IconColor.Primary,
      labelOptions: [
        { label: 'Deposit in progress', isBold: true },
        { label: '\n', isBold: false },
        { label: 'This may take a few minutes.', isBold: false },
      ],
      startAccessory: (
        <Spinner
          color={ReactNativeDsIconColor.IconDefault}
          spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
        />
      ),
    }),
  },
  {
    label: 'Icon error',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Warning,
      iconColor: IconColor.Error,
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
      iconColor: IconColor.Warning,
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
      iconColor: IconColor.Default,
      labelOptions: [
        { label: 'Network switched', isBold: true },
        { label: '\n', isBold: false },
        { label: 'You are now connected to Linea.', isBold: false },
      ],
    }),
  },
];

const getSpacingTriggers = (): ToastTrigger[] => [
  {
    label: '2-line description',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Confirmation,
      iconColor: IconColor.Success,
      labelOptions: [{ label: 'Order placed', isBold: true }],
      descriptionOptions: {
        description:
          'Your market order was submitted and is being processed on Ethereum Mainnet.',
      },
    }),
  },
  {
    label: '1-line description + link',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Confirmation,
      iconColor: IconColor.Success,
      labelOptions: [{ label: 'Order placed', isBold: true }],
      descriptionOptions: {
        description: 'Your market order was submitted.',
      },
      linkButtonOptions: {
        label: 'View activity',
        onPress: () => Alert.alert('View activity pressed'),
      },
    }),
  },
  {
    label: '1-line description + trailing button',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Confirmation,
      iconColor: IconColor.Success,
      labelOptions: [{ label: 'Deposit complete', isBold: true }],
      descriptionOptions: {
        description: '100 USDC added',
      },
      closeButtonOptions: {
        label: 'Track',
        variant: ButtonVariants.Secondary,
        onPress: () => Alert.alert('Track pressed'),
      },
    }),
  },
  {
    label: 'Wrapped title + description',
    getOptions: () => ({
      variant: ToastVariants.Icon,
      hasNoTimeout: true,
      iconName: IconName.Warning,
      iconColor: IconColor.Warning,
      labelOptions: [
        {
          label: 'Taking longer than expected for this transaction to complete',
          isBold: true,
        },
      ],
      descriptionOptions: {
        description: 'Your transaction is still pending.',
      },
    }),
  },
];

const getCloseActionTriggers = (): ToastTrigger[] => [
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
];

const getStorySections = (theme: Theme): ToastTriggerSection[] => [
  { title: 'Animation', triggers: getAutodismissTriggers() },
  { title: 'Plain', triggers: getPlainTriggers() },
  { title: 'Icon', triggers: getIconTriggers() },
  { title: 'Close / action', triggers: getCloseActionTriggers() },
  { title: 'Spacing', triggers: getSpacingTriggers() },
];

const ToastTriggerStoryContent = () => {
  const tw = useTailwind();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const sections = useMemo(() => getStorySections(theme), [theme]);

  const showToast = useCallback(
    (trigger: ToastTrigger) => {
      presentStoryToast(toastRef, trigger.getOptions(theme));
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
