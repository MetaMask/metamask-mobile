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

const QUICK_AMOUNTS = [5, 10, 50, 100] as const;

interface OrderQuickAmountsProps {
  /** Adds the pressed chip's value to the entered amount. */
  onAddAmount: (increment: number) => void;
  /** Disables chips while a quote is being submitted. */
  isDisabled?: boolean;
}

/**
 * The additive quick-amount chips beneath the amount group: each press
 * adds its value to the currently entered amount.
 */
export const OrderQuickAmounts = ({
  onAddAmount,
  isDisabled = false,
}: OrderQuickAmountsProps) => (
  <Box twClassName="flex-row gap-2">
    {QUICK_AMOUNTS.map((quickAmount) => (
      <Button
        key={quickAmount}
        testID={PredictOrderFlowTestIds.QUICK_AMOUNT(String(quickAmount))}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isDisabled={isDisabled}
        onPress={() => onAddAmount(quickAmount)}
        twClassName="h-11 flex-1 min-w-0 rounded-xl"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {`+${quickAmount}`}
        </Text>
      </Button>
    ))}
  </Box>
);
