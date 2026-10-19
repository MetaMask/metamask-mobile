import React, { useCallback } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { QuickAmount } from '../types';

interface AmountProps {
  amount: QuickAmount;
  onPress: (amount: QuickAmount) => void;
  isBuy: boolean;
  disabled?: boolean;
}

const Amount = ({ amount, onPress, isBuy, disabled }: AmountProps) => {
  const { value, isNative, label } = amount;
  const handlePress = useCallback(() => {
    onPress(amount);
  }, [onPress, amount]);

  const showSparkleIcon = !isBuy && value === 1 && isNative;

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      onPress={handlePress}
      isDisabled={disabled}
      isFullWidth
      twClassName="px-0 flex-1"
      startIconName={showSparkleIcon ? IconName.Sparkle : undefined}
    >
      {label}
    </Button>
  );
};

interface Props {
  amounts: QuickAmount[];
  isBuy: boolean;
  disabled?: boolean;
  onAmountPress: (amount: QuickAmount) => void;
}

const QuickAmounts = ({ amounts, onAmountPress, isBuy, disabled }: Props) => (
  <Box twClassName="flex-row gap-4">
    {amounts.map((amount, index) => (
      <Amount
        isBuy={isBuy}
        amount={amount}
        onPress={onAmountPress}
        key={index}
        disabled={disabled}
      />
    ))}
  </Box>
);

export default QuickAmounts;
