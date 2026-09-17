import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const QUICK_AMOUNTS = ['$20', '$50', '$100', '$250'] as const;

interface OrderQuickAmountsProps {
  /** Fills the amount entry with the pressed chip's value. */
  onAmountChange: (amount: string) => void;
}

/**
 * The quick-amount chips beneath the amount group.
 */
export const OrderQuickAmounts = ({
  onAmountChange,
}: OrderQuickAmountsProps) => (
  <Box twClassName="flex-row gap-2">
    {QUICK_AMOUNTS.map((quickAmount) => (
      <Button
        key={quickAmount}
        testID={PredictOrderFlowTestIds.QUICK_AMOUNT(quickAmount)}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={() => onAmountChange(quickAmount.replace('$', ''))}
        twClassName="h-11 flex-1 min-w-0 rounded-xl"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {quickAmount}
        </Text>
      </Button>
    ))}
  </Box>
);
