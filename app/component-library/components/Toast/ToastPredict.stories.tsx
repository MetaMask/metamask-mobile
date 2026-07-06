import React, { useCallback, useContext, useMemo, type RefObject } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { createPredictTransactionStatusChangedHandler } from '../../../components/UI/Predict/hooks/predictTransactionStatusChangedToastHandler';
import type { PredictTransactionStatusChangedPayload } from '../../../components/UI/Predict/controllers/PredictController';
import { formatPrice } from '../../../components/UI/Predict/utils/format';
import { strings } from '../../../../locales/i18n';
import { useAppThemeFromContext } from '../../../util/theme';
import Button, { ButtonVariants } from '../Buttons/Button';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import type { ToastRef } from './Toast.types';
import {
  presentStoryToast,
  StoryContainer,
  StoryToastHost,
} from './ToastStory.shared';

const MOCK_TRANSACTION_ID = 'c9a6ab70-8e70-11f0-8de9-353809172f0a';
const MOCK_SENDER_ADDRESS = '0x2990079bcdEe240329a520d2444386FC119da21a';

interface PredictToastTrigger {
  label: string;
  payload: PredictTransactionStatusChangedPayload;
}

interface PredictToastTriggerSection {
  title: string;
  triggers: PredictToastTrigger[];
}

const PREDICT_TOAST_SECTIONS: PredictToastTriggerSection[] = [
  {
    title: 'Deposit',
    triggers: [
      {
        label: 'Deposit approved',
        payload: {
          type: 'deposit',
          status: 'approved',
          transactionId: MOCK_TRANSACTION_ID,
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Deposit confirmed',
        payload: {
          type: 'deposit',
          status: 'confirmed',
          amount: 102,
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Deposit confirmed (no amount)',
        payload: {
          type: 'deposit',
          status: 'confirmed',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Deposit failed',
        payload: {
          type: 'deposit',
          status: 'failed',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
    ],
  },
  {
    title: 'Claim',
    triggers: [
      {
        label: 'Claim approved',
        payload: {
          type: 'claim',
          status: 'approved',
          amount: 55.12,
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Claim confirmed',
        payload: {
          type: 'claim',
          status: 'confirmed',
          amount: 45.5,
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Claim failed',
        payload: {
          type: 'claim',
          status: 'failed',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
    ],
  },
  {
    title: 'Withdraw',
    triggers: [
      {
        label: 'Withdraw approved',
        payload: {
          type: 'withdraw',
          status: 'approved',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Withdraw confirmed',
        payload: {
          type: 'withdraw',
          status: 'confirmed',
          senderAddress: MOCK_SENDER_ADDRESS,
          amount: 55.12,
          transactionId: MOCK_TRANSACTION_ID,
        },
      },
      {
        label: 'Withdraw failed',
        payload: {
          type: 'withdraw',
          status: 'failed',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
    ],
  },
  {
    title: 'Order',
    triggers: [
      {
        label: 'Order depositing',
        payload: {
          type: 'order',
          status: 'depositing',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Order confirmed',
        payload: {
          type: 'order',
          status: 'confirmed',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
      {
        label: 'Order failed',
        payload: {
          type: 'order',
          status: 'failed',
          senderAddress: MOCK_SENDER_ADDRESS,
        },
      },
    ],
  },
];

const predictStoryQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const createStoryShowToast =
  (toastRef: RefObject<ToastRef | null> | undefined): ToastRef['showToast'] =>
  (options) => {
    presentStoryToast(toastRef, options);
  };

const PredictToastsStoryContent = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const handler = useMemo(
    () =>
      createPredictTransactionStatusChangedHandler({
        queryClient: predictStoryQueryClient,
        navigation,
        theme,
        normalizedSelectedAddress: MOCK_SENDER_ADDRESS.toLowerCase(),
        bottomSheetEnabled: false,
        deposit: () => Promise.resolve(),
        claim: () => Promise.resolve(),
        withdraw: () => Promise.resolve(),
        withdrawTransactionAmount: 123.45,
        getTransactionMetadata: () => undefined,
        isPerpsPredictMoneyDeposit: () => false,
        isPerpsPredictMoneyWithdraw: () => false,
        shouldSuppressLegacyOrderFailureToast: () => false,
        getWithdrawConfirmedMessage: (_transactionId, fallbackAmount) => ({
          title: strings('predict.withdraw.withdraw_completed'),
          description: strings('predict.withdraw.withdraw_completed_subtitle', {
            amount: formatPrice(fallbackAmount),
          }),
        }),
      }),
    [navigation, theme],
  );

  const triggerPredictToast = useCallback(
    (trigger: PredictToastTrigger) => {
      handler(trigger.payload, createStoryShowToast(toastRef));
    },
    [handler, toastRef],
  );

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 p-4 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        {PREDICT_TOAST_SECTIONS.map((section) => (
          <View key={section.title} style={tw.style('gap-2')}>
            <Text variant={TextVariant.HeadingSm}>{section.title}</Text>
            {section.triggers.map((trigger) => (
              <Button
                key={trigger.label}
                variant={ButtonVariants.Secondary}
                label={trigger.label}
                onPress={() => triggerPredictToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const PredictToastsStory = () => (
  <QueryClientProvider client={predictStoryQueryClient}>
    <ToastContextWrapper>
      <PredictToastsStoryContent />
    </ToastContextWrapper>
  </QueryClientProvider>
);

const PredictToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default PredictToastsMeta;

export const PredictToasts = {
  render: () => <PredictToastsStory />,
};
