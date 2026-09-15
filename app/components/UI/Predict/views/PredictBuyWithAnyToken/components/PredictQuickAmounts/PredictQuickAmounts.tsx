import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { ImpactMoment, useHaptics } from '../../../../../../../util/haptics';
import React from 'react';

const QUICK_AMOUNTS = [20, 50, 100, 250] as const;

interface PredictQuickAmountsProps {
  onSelectAmount: (amount: number) => void;
  disabled?: boolean;
}

function PredictQuickAmounts({
  onSelectAmount,
  disabled = false,
}: PredictQuickAmountsProps) {
  const { playImpact } = useHaptics();

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-1">
      {QUICK_AMOUNTS.map((amount) => (
        <Button
          key={amount}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Md}
          onPress={async () => {
            playImpact(ImpactMoment.QuickAmountSelection);
            onSelectAmount(amount);
          }}
          isDisabled={disabled}
          twClassName="h-11 flex-1"
        >
          {`$${amount}`}
        </Button>
      ))}
    </Box>
  );
}

export default PredictQuickAmounts;
