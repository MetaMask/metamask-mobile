import React, { useCallback, useContext, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import useEarnToasts, {
  type EarnToastOptions,
  type EarnToastOptionsConfig,
} from '../../../components/UI/Earn/hooks/useEarnToasts';
import Button, { ButtonVariants } from '../Buttons/Button';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { StoryContainer, StoryToastHost } from './ToastStory.shared';

const MOCK_TOKEN_SYMBOL = 'USDC';
const MOCK_WITHDRAWAL_ERRORS = [
  'Insufficient TRX balance',
  'Network connection timed out',
];

interface EarnToastTrigger {
  label: string;
  getConfig: (options: EarnToastOptionsConfig) => EarnToastOptions;
}

interface EarnToastTriggerSection {
  title: string;
  triggers: EarnToastTrigger[];
}

const buildEarnToastSections = (
  options: EarnToastOptionsConfig,
): EarnToastTriggerSection[] => [
  {
    title: 'mUSD conversion',
    triggers: [
      {
        label: 'Conversion in progress',
        getConfig: () =>
          options.mUsdConversion.inProgress({
            tokenSymbol: MOCK_TOKEN_SYMBOL,
          }),
      },
      {
        label: 'Conversion success',
        getConfig: () => options.mUsdConversion.success,
      },
      {
        label: 'Conversion failed',
        getConfig: () => options.mUsdConversion.failed,
      },
    ],
  },
  {
    title: 'Bonus claim',
    triggers: [
      {
        label: 'Claim in progress',
        getConfig: () => options.bonusClaim.inProgress,
      },
      {
        label: 'Claim success',
        getConfig: () => options.bonusClaim.success,
      },
      {
        label: 'Claim failed',
        getConfig: () => options.bonusClaim.failed,
      },
    ],
  },
  {
    title: 'TRON withdrawal',
    triggers: [
      {
        label: 'Withdrawal failed',
        getConfig: () => options.tronWithdrawal.failed(MOCK_WITHDRAWAL_ERRORS),
      },
      {
        label: 'Withdrawal failed (no details)',
        getConfig: () => options.tronWithdrawal.failed([]),
      },
    ],
  },
];

const EarnToastsStoryContent = () => {
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { showToast, EarnToastOptions } = useEarnToasts();
  const sections = useMemo(
    () => buildEarnToastSections(EarnToastOptions),
    [EarnToastOptions],
  );

  const triggerEarnToast = useCallback(
    (trigger: EarnToastTrigger) => {
      showToast({
        ...trigger.getConfig(EarnToastOptions),
        hasNoTimeout: true,
      });
    },
    [EarnToastOptions, showToast],
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
                onPress={() => triggerEarnToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const EarnToastsStory = () => (
  <ToastContextWrapper>
    <EarnToastsStoryContent />
  </ToastContextWrapper>
);

const EarnToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default EarnToastsMeta;

export const EarnToasts = {
  render: () => <EarnToastsStory />,
};
