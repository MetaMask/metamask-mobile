import React from 'react';
import {
  Box,
  Button,
  ButtonBase,
  ButtonSize,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const QUICK_AMOUNTS = ['$20', '$50', '$100', '$250'] as const;

const AMOUNT_TEXT_TW = 'text-[54px] font-semibold leading-[60px]';

interface OrderAmountInputProps {
  amount: string;
  /** Opens the in-sheet keypad. */
  onAmountPress: () => void;
  onAmountChange: (amount: string) => void;
}

/**
 * USD amount entry: the big centered figure (pressable to open the keypad)
 * with quick amount chips beneath it.
 */
export const OrderAmountInput = ({
  amount,
  onAmountPress,
  onAmountChange,
}: OrderAmountInputProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="gap-3">
      {/* The $ and the amount are one centered group, per the design. */}
      <ButtonBase
        twClassName="w-full rounded-none bg-transparent py-2"
        onPress={onAmountPress}
        testID={PredictOrderFlowTestIds.AMOUNT_INPUT}
        accessibilityLabel={strings('predict_next.order_preview.amount')}
      >
        <Box twClassName="flex-row items-center justify-center">
          <Text twClassName={`${AMOUNT_TEXT_TW} text-default`}>$</Text>
          <Text
            twClassName={
              amount
                ? `${AMOUNT_TEXT_TW} text-default`
                : `${AMOUNT_TEXT_TW} text-alternative`
            }
          >
            {amount || '0'}
          </Text>
        </Box>
      </ButtonBase>
      <Box twClassName="flex-row gap-2">
        {QUICK_AMOUNTS.map((quickAmount) => (
          <Button
            key={quickAmount}
            testID={PredictOrderFlowTestIds.QUICK_AMOUNT(quickAmount)}
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={() => onAmountChange(quickAmount.replace('$', ''))}
            twClassName="h-12 flex-1 min-w-0"
          >
            <Text>{quickAmount}</Text>
          </Button>
        ))}
      </Box>
    </Box>
  );
};
