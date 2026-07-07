import React, { useCallback, useContext, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import useMoneyToasts, {
  type MoneyToastOptions,
  type MoneyToastOptionsConfig,
} from '../../../components/UI/Money/hooks/useMoneyToasts';
import { strings } from '../../../../locales/i18n';
import Button, { ButtonVariants } from '../Buttons/Button';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { StoryContainer, StoryToastHost } from './ToastStory.shared';

const MOCK_FIAT_AMOUNT = '$50.00';
const MOCK_WITHDRAW_DESTINATION = strings(
  'money.toasts.withdraw_fallback_destination',
);

interface MoneyToastTrigger {
  label: string;
  getConfig: (options: MoneyToastOptionsConfig) => MoneyToastOptions;
}

interface MoneyToastTriggerSection {
  title: string;
  triggers: MoneyToastTrigger[];
}

const buildMoneyToastSections = (
  options: MoneyToastOptionsConfig,
): MoneyToastTriggerSection[] => [
  {
    title: 'Deposit — convert',
    triggers: [
      {
        label: 'In progress',
        getConfig: () => options.deposit.inProgress({ intent: 'convert' }),
      },
      {
        label: 'Success',
        getConfig: () =>
          options.deposit.success({
            amountFiat: MOCK_FIAT_AMOUNT,
            intent: 'convert',
          }),
      },
      {
        label: 'Success (no amount)',
        getConfig: () => options.deposit.success({ intent: 'convert' }),
      },
      {
        label: 'Failed',
        getConfig: () => options.deposit.failed({ intent: 'convert' }),
      },
    ],
  },
  {
    title: 'Deposit — add mUSD',
    triggers: [
      {
        label: 'In progress',
        getConfig: () => options.deposit.inProgress({ intent: 'addMusd' }),
      },
      {
        label: 'Success',
        getConfig: () =>
          options.deposit.success({
            amountFiat: MOCK_FIAT_AMOUNT,
            intent: 'addMusd',
          }),
      },
      {
        label: 'Failed',
        getConfig: () => options.deposit.failed({ intent: 'addMusd' }),
      },
    ],
  },
  {
    title: 'Deposit — card',
    triggers: [
      {
        label: 'In progress',
        getConfig: () => options.deposit.inProgress({ intent: 'card' }),
      },
      {
        label: 'Success',
        getConfig: () =>
          options.deposit.success({
            amountFiat: MOCK_FIAT_AMOUNT,
            intent: 'card',
          }),
      },
      {
        label: 'Failed',
        getConfig: () => options.deposit.failed({ intent: 'card' }),
      },
    ],
  },
  {
    title: 'Withdraw',
    triggers: [
      {
        label: 'In progress',
        getConfig: () => options.withdraw.inProgress(),
      },
      {
        label: 'Success',
        getConfig: () =>
          options.withdraw.success({
            amountFiat: MOCK_FIAT_AMOUNT,
            destination: MOCK_WITHDRAW_DESTINATION,
          }),
      },
      {
        label: 'Success (no amount)',
        getConfig: () =>
          options.withdraw.success({
            destination: MOCK_WITHDRAW_DESTINATION,
          }),
      },
      {
        label: 'Failed',
        getConfig: () => options.withdraw.failed(),
      },
    ],
  },
  {
    title: 'Send',
    triggers: [
      {
        label: 'In progress',
        getConfig: () => options.send.inProgress(),
      },
      {
        label: 'Success — Perps',
        getConfig: () =>
          options.send.success({
            amountFiat: MOCK_FIAT_AMOUNT,
            destination: strings('money.toasts.send_destination_perps'),
          }),
      },
      {
        label: 'Success — Predict (no amount)',
        getConfig: () =>
          options.send.success({
            destination: strings('money.toasts.send_destination_predict'),
          }),
      },
      {
        label: 'Failed',
        getConfig: () => options.send.failed(),
      },
    ],
  },
];

const MoneyToastsStoryContent = () => {
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { showToast, MoneyToastOptions } = useMoneyToasts();
  const sections = useMemo(
    () => buildMoneyToastSections(MoneyToastOptions),
    [MoneyToastOptions],
  );

  const triggerMoneyToast = useCallback(
    (trigger: MoneyToastTrigger) => {
      showToast({
        ...trigger.getConfig(MoneyToastOptions),
        hasNoTimeout: true,
      });
    },
    [MoneyToastOptions, showToast],
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
                onPress={() => triggerMoneyToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const MoneyToastsStory = () => (
  <ToastContextWrapper>
    <MoneyToastsStoryContent />
  </ToastContextWrapper>
);

const MoneyToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default MoneyToastsMeta;

export const MoneyToasts = {
  render: () => <MoneyToastsStory />,
};
