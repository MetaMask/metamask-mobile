import React, { useCallback, useContext, useMemo, type RefObject } from 'react';
import { ScrollView, View } from 'react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { usePerpsWithdrawToastRegistrations } from '../../../components/UI/Perps/hooks/usePerpsWithdrawToastRegistrations';
import { strings } from '../../../../locales/i18n';
import { IconName } from '../Icons/Icon';
import Toast, { ToastVariants } from './Toast';
import { useAppThemeFromContext } from '../../../util/theme';
import type { Theme } from '../../../util/theme/models';
import Button, { ButtonVariants } from '../Buttons/Button';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import type { ToastOptions, ToastRef } from './Toast.types';
import {
  presentStoryToast,
  StoryContainer,
  StoryToastHost,
} from './ToastStory.shared';

const MOCK_PENDING_TX_ID = 'perps-withdraw-story-pending';
const MOCK_CONFIRMED_TX_ID = 'perps-withdraw-story-confirmed';
const MOCK_FAILED_TX_ID = 'perps-withdraw-story-failed';

interface PerpsWithdrawHandlerTrigger {
  label: string;
  transactionId: string;
  status: TransactionStatus;
}

interface PerpsWithdrawDescriptionTrigger {
  label: string;
  description: string;
}

interface PerpsWithdrawToastTriggerSection {
  title: string;
  handlerTriggers?: PerpsWithdrawHandlerTrigger[];
  descriptionTriggers?: PerpsWithdrawDescriptionTrigger[];
}

const PERPS_WITHDRAW_TOAST_SECTIONS: PerpsWithdrawToastTriggerSection[] = [
  {
    title: 'Lifecycle',
    handlerTriggers: [
      {
        label: 'Pending',
        transactionId: MOCK_PENDING_TX_ID,
        status: TransactionStatus.approved,
      },
      {
        label: 'Confirmed (generic)',
        transactionId: MOCK_CONFIRMED_TX_ID,
        status: TransactionStatus.confirmed,
      },
      {
        label: 'Failed',
        transactionId: MOCK_FAILED_TX_ID,
        status: TransactionStatus.failed,
      },
    ],
  },
  {
    title: 'Confirmed descriptions',
    descriptionTriggers: [
      {
        label: 'Generic',
        description: strings(
          'perps.withdrawal.toast_completed_subtitle_generic',
        ),
      },
      {
        label: 'Post-quote token',
        description: strings(
          'perps.withdrawal.toast_completed_any_token_subtitle',
          {
            amount: '$0.25',
            token: 'BNB',
          },
        ),
      },
      {
        label: 'Post-quote ticker fallback',
        description: strings(
          'perps.withdrawal.toast_completed_any_token_subtitle',
          {
            amount: '$1.50',
            token: 'ETH',
          },
        ),
      },
    ],
  },
];

const buildConfirmedWithdrawToast = (
  theme: Theme,
  description: string,
): ToastOptions => ({
  variant: ToastVariants.Icon,
  labelOptions: [
    {
      label: strings('perps.withdrawal.toast_completed_title'),
      isBold: true,
    },
    { label: '\n', isBold: false },
    { label: description, isBold: false },
  ],
  iconName: IconName.Confirmation,
  iconColor: theme.colors.success.default,
  hasNoTimeout: false,
});

const createStoryShowToast =
  (toastRef: RefObject<ToastRef | null> | undefined): ToastRef['showToast'] =>
  (options) => {
    presentStoryToast(toastRef, options);
  };

const PerpsWithdrawToastsStoryContent = () => {
  const tw = useTailwind();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);
  const registrations = usePerpsWithdrawToastRegistrations();
  const handler = registrations[0]?.handler;

  const triggerHandlerToast = useCallback(
    (trigger: PerpsWithdrawHandlerTrigger) => {
      handler?.(
        {
          transactionMeta: {
            id: trigger.transactionId,
            type: TransactionType.perpsWithdraw,
            status: trigger.status,
          } as TransactionMeta,
        },
        createStoryShowToast(toastRef),
      );
    },
    [handler, toastRef],
  );

  const triggerDescriptionToast = useCallback(
    (trigger: PerpsWithdrawDescriptionTrigger) => {
      presentStoryToast(
        toastRef,
        buildConfirmedWithdrawToast(theme, trigger.description),
      );
    },
    [theme, toastRef],
  );

  const sections = useMemo(() => PERPS_WITHDRAW_TOAST_SECTIONS, []);

  return (
    <StoryContainer>
      <ScrollView
        contentContainerStyle={tw.style('gap-6 p-4 pb-32')}
        keyboardShouldPersistTaps="handled"
      >
        {sections.map((section) => (
          <View key={section.title} style={tw.style('gap-2')}>
            <Text variant={TextVariant.HeadingSm}>{section.title}</Text>
            {section.handlerTriggers?.map((trigger) => (
              <Button
                key={`${section.title}-${trigger.label}`}
                variant={ButtonVariants.Secondary}
                label={trigger.label}
                onPress={() => triggerHandlerToast(trigger)}
              />
            ))}
            {section.descriptionTriggers?.map((trigger) => (
              <Button
                key={`${section.title}-${trigger.label}`}
                variant={ButtonVariants.Secondary}
                label={trigger.label}
                onPress={() => triggerDescriptionToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const PerpsWithdrawToastsStory = () => (
  <ToastContextWrapper>
    <PerpsWithdrawToastsStoryContent />
  </ToastContextWrapper>
);

const PerpsWithdrawToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default PerpsWithdrawToastsMeta;

export const PerpsWithdrawToasts = {
  render: () => <PerpsWithdrawToastsStory />,
};
