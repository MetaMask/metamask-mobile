import React, { useCallback, useContext, useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import {
  buildV2OrderToastOptions,
  type V2OrderToastParams,
} from '../../../components/UI/Ramp/utils/v2OrderToast';
import Button, { ButtonVariants } from '../Buttons/Button';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import type { ToastOptions } from './Toast.types';
import {
  presentStoryToast,
  StoryContainer,
  StoryToastHost,
} from './ToastStory.shared';

const MOCK_ORDER_ID = 'ramp-story-order-001';
const MOCK_CRYPTOCURRENCY = 'ETH';
const MOCK_CRYPTO_AMOUNT = '1.5';

interface RampToastTrigger {
  label: string;
  params: V2OrderToastParams;
}

const RAMP_TOAST_TRIGGERS: RampToastTrigger[] = [
  {
    label: 'Pending',
    params: {
      orderId: MOCK_ORDER_ID,
      cryptocurrency: MOCK_CRYPTOCURRENCY,
      cryptoAmount: MOCK_CRYPTO_AMOUNT,
      status: RampsOrderStatus.Pending,
    },
  },
  {
    label: 'Completed',
    params: {
      orderId: MOCK_ORDER_ID,
      cryptocurrency: MOCK_CRYPTOCURRENCY,
      cryptoAmount: MOCK_CRYPTO_AMOUNT,
      status: RampsOrderStatus.Completed,
    },
  },
  {
    label: 'Completed (no amount)',
    params: {
      orderId: MOCK_ORDER_ID,
      cryptocurrency: MOCK_CRYPTOCURRENCY,
      status: RampsOrderStatus.Completed,
    },
  },
  {
    label: 'Failed',
    params: {
      orderId: MOCK_ORDER_ID,
      cryptocurrency: MOCK_CRYPTOCURRENCY,
      status: RampsOrderStatus.Failed,
    },
  },
  {
    label: 'Cancelled',
    params: {
      orderId: MOCK_ORDER_ID,
      cryptocurrency: MOCK_CRYPTOCURRENCY,
      status: RampsOrderStatus.Cancelled,
    },
  },
];

const toStoryRampToastOptions = (
  options: ToastOptions | null,
): ToastOptions | null => {
  if (!options) {
    return null;
  }

  if (!options.linkButtonOptions) {
    return options;
  }

  return {
    ...options,
    linkButtonOptions: {
      ...options.linkButtonOptions,
      onPress: () => Alert.alert('Storybook', 'Track order pressed'),
    },
  };
};

const RampToastsStoryContent = () => {
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);

  const triggerRampToast = useCallback(
    (trigger: RampToastTrigger) => {
      const options = toStoryRampToastOptions(
        buildV2OrderToastOptions(trigger.params),
      );

      if (!options) {
        Alert.alert('Storybook', 'This status does not produce a toast.');
        return;
      }

      presentStoryToast(toastRef, options);
    },
    [toastRef],
  );

  const triggers = useMemo(() => RAMP_TOAST_TRIGGERS, []);

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 p-4 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        <View style={tw.style('gap-2')}>
          <Text variant={TextVariant.HeadingSm}>Ramps V2 orders</Text>
          {triggers.map((trigger) => (
            <Button
              key={trigger.label}
              variant={ButtonVariants.Secondary}
              label={trigger.label}
              onPress={() => triggerRampToast(trigger)}
            />
          ))}
        </View>
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const RampToastsStory = () => (
  <ToastContextWrapper>
    <RampToastsStoryContent />
  </ToastContextWrapper>
);

const RampToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default RampToastsMeta;

export const RampToasts = {
  render: () => <RampToastsStory />,
};
