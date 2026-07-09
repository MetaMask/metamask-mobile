import React, { useCallback, useContext, useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import type { OrderDirection, Position } from '@metamask/perps-controller';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import usePerpsToasts, {
  type PerpsToastOptions,
  type PerpsToastOptionsConfig,
} from '../../../components/UI/Perps/hooks/usePerpsToasts';
import Button, { ButtonVariants } from '../Buttons/Button';
import Toast from './Toast';
import { ToastContext, ToastContextWrapper } from './Toast.context';
import { StoryContainer, StoryToastHost } from './ToastStory.shared';

const MOCK_TRANSACTION_ID = 'c9a6ab70-8e70-11f0-8de9-353809172f0a';
const MOCK_LONG = 'long' as OrderDirection;
const MOCK_SHORT = 'short' as OrderDirection;
const MOCK_ETH = 'ETH';
const MOCK_BTC = 'BTC';
const MOCK_AMOUNT = '1.5';

const MOCK_FULL_POSITION = {
  symbol: MOCK_ETH,
  size: MOCK_AMOUNT,
  unrealizedPnl: '100',
  returnOnEquity: '0.15',
} as Position;

const MOCK_PARTIAL_POSITION = {
  symbol: MOCK_BTC,
  size: '-0.5',
  unrealizedPnl: '50',
  returnOnEquity: '0.08',
} as Position;

interface PerpsToastTrigger {
  label: string;
  getConfig: (options: PerpsToastOptionsConfig) => PerpsToastOptions;
}

interface PerpsToastTriggerSection {
  title: string;
  triggers: PerpsToastTrigger[];
}

const buildPerpsToastSections = (
  options: PerpsToastOptionsConfig,
): PerpsToastTriggerSection[] => [
  {
    title: 'Deposit',
    triggers: [
      {
        label: 'Deposit success',
        getConfig: () => options.accountManagement.deposit.success('100'),
      },
      {
        label: 'Deposit in progress',
        getConfig: () =>
          options.accountManagement.deposit.inProgress(60, MOCK_TRANSACTION_ID),
      },
      {
        label: 'Deposit taking longer',
        getConfig: () => options.accountManagement.deposit.takingLonger,
      },
      {
        label: 'Trade canceled',
        getConfig: () => options.accountManagement.deposit.tradeCanceled,
      },
      {
        label: 'Deposit error',
        getConfig: () => options.accountManagement.deposit.error,
      },
    ],
  },
  {
    title: 'One-click trade',
    triggers: [
      {
        label: 'Tx creation failed',
        getConfig: () =>
          options.accountManagement.oneClickTrade.txCreationFailed,
      },
    ],
  },
  {
    title: 'Withdrawal',
    triggers: [
      {
        label: 'Withdrawal in progress',
        getConfig: () =>
          options.accountManagement.withdrawal.withdrawalInProgress,
      },
      {
        label: 'Withdrawal success',
        getConfig: () =>
          options.accountManagement.withdrawal.withdrawalSuccess('101', 'USDC'),
      },
      {
        label: 'Withdrawal failed',
        getConfig: () =>
          options.accountManagement.withdrawal.withdrawalFailed(
            'Insufficient balance',
          ),
      },
      {
        label: 'Withdrawal start failed',
        getConfig: () =>
          options.accountManagement.withdrawal.withdrawalStartFailed(() => {
            Alert.alert('Retry pressed');
          }),
      },
    ],
  },
  {
    title: 'Market orders',
    triggers: [
      {
        label: 'Market submitted',
        getConfig: () =>
          options.orderManagement.market.submitted(
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
          ),
      },
      {
        label: 'Market confirmed',
        getConfig: () =>
          options.orderManagement.market.confirmed(
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
          ),
      },
      {
        label: 'Market creation failed',
        getConfig: () =>
          options.orderManagement.market.creationFailed('Order rejected'),
      },
    ],
  },
  {
    title: 'Limit orders',
    triggers: [
      {
        label: 'Limit submitted',
        getConfig: () =>
          options.orderManagement.limit.submitted(
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
          ),
      },
      {
        label: 'Limit confirmed',
        getConfig: () =>
          options.orderManagement.limit.confirmed(
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
          ),
      },
      {
        label: 'Limit creation failed',
        getConfig: () =>
          options.orderManagement.limit.creationFailed('Insufficient margin'),
      },
    ],
  },
  {
    title: 'Order shared',
    triggers: [
      {
        label: 'Submitting',
        getConfig: () => options.orderManagement.shared.submitting(),
      },
      {
        label: 'Cancellation in progress',
        getConfig: () =>
          options.orderManagement.shared.cancellationInProgress(
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
            'Limit',
          ),
      },
      {
        label: 'Cancellation success',
        getConfig: () =>
          options.orderManagement.shared.cancellationSuccess(
            false,
            'Limit',
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
          ),
      },
      {
        label: 'Cancellation failed',
        getConfig: () => options.orderManagement.shared.cancellationFailed,
      },
    ],
  },
  {
    title: 'Close position — market',
    triggers: [
      {
        label: 'Full close in progress',
        getConfig: () =>
          options.positionManagement.closePosition.marketClose.full.closeFullPositionInProgress(
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
          ),
      },
      {
        label: 'Full close success',
        getConfig: () =>
          options.positionManagement.closePosition.marketClose.full.closeFullPositionSuccess(
            MOCK_FULL_POSITION,
            '3200',
          ),
      },
      {
        label: 'Full close failed',
        getConfig: () =>
          options.positionManagement.closePosition.marketClose.full
            .closeFullPositionFailed,
      },
      {
        label: 'Partial close in progress',
        getConfig: () =>
          options.positionManagement.closePosition.marketClose.partial.closePartialPositionInProgress(
            MOCK_SHORT,
            '-0.5',
            MOCK_BTC,
          ),
      },
      {
        label: 'Partial close success',
        getConfig: () =>
          options.positionManagement.closePosition.marketClose.partial.closePartialPositionSuccess(
            MOCK_PARTIAL_POSITION,
            '98000',
          ),
      },
      {
        label: 'Partial close failed',
        getConfig: () =>
          options.positionManagement.closePosition.marketClose.partial
            .closePartialPositionFailed,
      },
    ],
  },
  {
    title: 'Close position — limit',
    triggers: [
      {
        label: 'Full limit close submitted',
        getConfig: () =>
          options.positionManagement.closePosition.limitClose.full.fullPositionCloseSubmitted(
            MOCK_LONG,
            MOCK_AMOUNT,
            MOCK_ETH,
          ),
      },
      {
        label: 'Partial limit close submitted',
        getConfig: () =>
          options.positionManagement.closePosition.limitClose.partial.partialPositionCloseSubmitted(
            MOCK_SHORT,
            '-0.5',
            MOCK_BTC,
          ),
      },
      {
        label: 'Missing limit price',
        getConfig: () =>
          options.positionManagement.closePosition.limitClose.partial
            .switchToMarketOrderMissingLimitPrice,
      },
    ],
  },
  {
    title: 'TP/SL',
    triggers: [
      {
        label: 'Update success',
        getConfig: () => options.positionManagement.tpsl.updateTPSLSuccess,
      },
      {
        label: 'Update error',
        getConfig: () =>
          options.positionManagement.tpsl.updateTPSLError('Invalid price'),
      },
    ],
  },
  {
    title: 'Margin',
    triggers: [
      {
        label: 'Add success',
        getConfig: () =>
          options.positionManagement.margin.addSuccess(MOCK_ETH, '50'),
      },
      {
        label: 'Remove success',
        getConfig: () =>
          options.positionManagement.margin.removeSuccess(MOCK_ETH, '25'),
      },
      {
        label: 'Adjustment failed',
        getConfig: () =>
          options.positionManagement.margin.adjustmentFailed('Margin too low'),
      },
    ],
  },
  {
    title: 'Form validation',
    triggers: [
      {
        label: 'Validation error',
        getConfig: () =>
          options.formValidation.orderForm.validationError(
            'Minimum order size is 0.01 ETH',
          ),
      },
      {
        label: 'Limit price required',
        getConfig: () => options.formValidation.orderForm.limitPriceRequired,
      },
    ],
  },
  {
    title: 'Data fetching',
    triggers: [
      {
        label: 'Market data unavailable',
        getConfig: () =>
          options.dataFetching.market.error.marketDataUnavailable(MOCK_ETH),
      },
    ],
  },
  {
    title: 'Content sharing',
    triggers: [
      {
        label: 'PnL share success',
        getConfig: () => options.contentSharing.pnlHeroCard.shareSuccess,
      },
      {
        label: 'PnL share failed',
        getConfig: () => options.contentSharing.pnlHeroCard.shareFailed,
      },
    ],
  },
  {
    title: 'Watchlist',
    triggers: [
      {
        label: 'Add error',
        getConfig: () => options.watchlist.addError,
      },
      {
        label: 'Limit reached',
        getConfig: () => options.watchlist.limitReached,
      },
    ],
  },
];

const PerpsToastsStoryContent = () => {
  const tw = useTailwind();
  const { toastRef } = useContext(ToastContext);
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const sections = useMemo(
    () => buildPerpsToastSections(PerpsToastOptions),
    [PerpsToastOptions],
  );

  const triggerPerpsToast = useCallback(
    (trigger: PerpsToastTrigger) => {
      showToast({
        ...trigger.getConfig(PerpsToastOptions),
        hasNoTimeout: true,
      });
    },
    [PerpsToastOptions, showToast],
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
                onPress={() => triggerPerpsToast(trigger)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <StoryToastHost toastRef={toastRef} />
    </StoryContainer>
  );
};

const PerpsToastsStory = () => (
  <ToastContextWrapper>
    <PerpsToastsStoryContent />
  </ToastContextWrapper>
);

const PerpsToastsMeta = {
  title: 'Component Library / Toast',
  component: Toast,
};

export default PerpsToastsMeta;

export const PerpsToasts = {
  render: () => <PerpsToastsStory />,
};
