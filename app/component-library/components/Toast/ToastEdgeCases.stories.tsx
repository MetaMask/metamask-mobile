import React, { useCallback, useContext, useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { buildShareCopiedToastOptions } from '../../../components/UI/Predict/hooks/usePredictShare.utils';
import { strings } from '../../../../locales/i18n';
import { useAppThemeFromContext } from '../../../util/theme';
import { getNetworkImageSource } from '../../../util/networks';
import Button, { ButtonVariants } from '../Buttons/Button';
import type { ButtonProps } from '../Buttons/Button/Button.types';
import { IconName } from '../Icons/Icon';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { ToastVariants, type ToastOptions } from './Toast.types';
import { TEST_NETWORK_IMAGE_SOURCE } from './Toast.constants';
import {
  presentStoryToast,
  StoryContainer,
  StoryToastHost,
} from './ToastStory.shared';

interface EdgeCaseToastTrigger {
  label: string;
  getOptions: (params: {
    successColor: string;
    tokenImageUri?: string;
  }) => ToastOptions;
}

const EDGE_CASE_TOAST_SECTIONS: {
  title: string;
  triggers: EdgeCaseToastTrigger[];
}[] = [
  {
    title: 'Gas fee token (confirmations)',
    triggers: [
      {
        label: 'Network token image',
        getOptions: ({ tokenImageUri }) => ({
          variant: ToastVariants.Network,
          hasNoTimeout: false,
          customBottomOffset: 24,
          labelOptions: [
            { label: strings('gas_fee_token_toast.message'), isBold: false },
            { label: 'USDC', isBold: true },
            { label: '.', isBold: false },
          ],
          networkImageSource: tokenImageUri
            ? { uri: tokenImageUri }
            : TEST_NETWORK_IMAGE_SOURCE,
          closeButtonOptions: {
            variant: ButtonVariants.Primary,
            endIconName: IconName.Close,
            onPress: () => Alert.alert('Storybook', 'Close pressed'),
            style: {
              backgroundColor: 'transparent',
              paddingHorizontal: 4,
              paddingVertical: 10,
              height: 20,
            },
          } satisfies ButtonProps,
        }),
      },
      {
        label: 'Chain fallback image',
        getOptions: () => ({
          variant: ToastVariants.Network,
          hasNoTimeout: false,
          customBottomOffset: 24,
          labelOptions: [
            { label: strings('gas_fee_token_toast.message'), isBold: false },
            { label: 'ETH', isBold: true },
            { label: '.', isBold: false },
          ],
          networkImageSource: getNetworkImageSource({ chainId: '0x1' }),
          closeButtonOptions: {
            variant: ButtonVariants.Primary,
            endIconName: IconName.Close,
            onPress: () => Alert.alert('Storybook', 'Close pressed'),
            style: {
              backgroundColor: 'transparent',
              paddingHorizontal: 4,
              paddingVertical: 10,
              height: 20,
            },
          } satisfies ButtonProps,
        }),
      },
    ],
  },
  {
    title: 'Predict share copied',
    triggers: [
      {
        label: 'Copied to clipboard',
        getOptions: ({ successColor }) =>
          buildShareCopiedToastOptions({
            label: strings('predict.toasts.copied_to_clipboard'),
            successColor,
          }),
      },
    ],
  },
];

const EdgeCaseToastsStoryContent = () => {
  const tw = useTailwind();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const sections = useMemo(() => EDGE_CASE_TOAST_SECTIONS, []);

  const triggerEdgeCaseToast = useCallback(
    (trigger: EdgeCaseToastTrigger) => {
      presentStoryToast(
        toastRef,
        trigger.getOptions({
          successColor: theme.colors.success.default,
          tokenImageUri:
            'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
        }),
      );
    },
    [theme.colors.success.default, toastRef],
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
                key={`${section.title}-${trigger.label}`}
                variant={ButtonVariants.Secondary}
                label={trigger.label}
                onPress={() => triggerEdgeCaseToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const EdgeCaseToastsStory = () => (
  <ToastContextWrapper>
    <EdgeCaseToastsStoryContent />
  </ToastContextWrapper>
);

const EdgeCaseToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default EdgeCaseToastsMeta;

export const EdgeCases = {
  render: () => <EdgeCaseToastsStory />,
};
