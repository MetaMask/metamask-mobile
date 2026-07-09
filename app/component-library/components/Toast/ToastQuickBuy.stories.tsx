import React, { useCallback, useContext, useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import {
  buildQuickBuyToastOptions,
  type QuickBuyToastKind,
} from '../../../components/Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/quickBuyToastOptions';
import type { TrackedQuickBuyTrade } from '../../../components/Views/SocialLeaderboard/TraderPositionView/components/QuickBuy/quickBuyTradeTracker';
import { useAppThemeFromContext } from '../../../util/theme';
import Button, { ButtonVariants } from '../Buttons/Button';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import type { ToastOptions } from './Toast.types';
import {
  presentStoryToast,
  StoryContainer,
  StoryToastHost,
} from './ToastStory.shared';

const MOCK_BUY_TRADE: TrackedQuickBuyTrade = {
  tradeMode: 'buy',
  tokenSymbol: 'PEPE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$50.00',
  rate: '1 USDC = 1,000 PEPE',
};

const MOCK_SELL_TRADE: TrackedQuickBuyTrade = {
  tradeMode: 'sell',
  tokenSymbol: 'DOGE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$25.00',
};

interface QuickBuyToastTrigger {
  label: string;
  kind: QuickBuyToastKind;
  trade: TrackedQuickBuyTrade;
}

interface QuickBuyToastTriggerSection {
  title: string;
  triggers: QuickBuyToastTrigger[];
}

const QUICK_BUY_TOAST_SECTIONS: QuickBuyToastTriggerSection[] = [
  {
    title: 'Buy',
    triggers: [
      {
        label: 'Pending',
        kind: 'pending',
        trade: MOCK_BUY_TRADE,
      },
      {
        label: 'Complete',
        kind: 'complete',
        trade: MOCK_BUY_TRADE,
      },
      {
        label: 'Failed',
        kind: 'failed',
        trade: MOCK_BUY_TRADE,
      },
    ],
  },
  {
    title: 'Sell',
    triggers: [
      {
        label: 'Pending',
        kind: 'pending',
        trade: MOCK_SELL_TRADE,
      },
      {
        label: 'Complete',
        kind: 'complete',
        trade: MOCK_SELL_TRADE,
      },
      {
        label: 'Failed (no rate)',
        kind: 'failed',
        trade: MOCK_SELL_TRADE,
      },
    ],
  },
];

const QuickBuyToastsStoryContent = () => {
  const tw = useTailwind();
  const theme = useAppThemeFromContext();
  const { toastRef } = useContext(ToastContext);

  const triggerQuickBuyToast = useCallback(
    (trigger: QuickBuyToastTrigger) => {
      const options: ToastOptions = buildQuickBuyToastOptions(trigger.kind, {
        trade: trigger.trade,
        theme,
      });
      presentStoryToast(toastRef, options);
    },
    [theme, toastRef],
  );

  const sections = useMemo(() => QUICK_BUY_TOAST_SECTIONS, []);

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
                onPress={() => triggerQuickBuyToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const QuickBuyToastsStory = () => (
  <ToastContextWrapper>
    <QuickBuyToastsStoryContent />
  </ToastContextWrapper>
);

const QuickBuyToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default QuickBuyToastsMeta;

export const QuickBuyToasts = {
  render: () => <QuickBuyToastsStory />,
};
