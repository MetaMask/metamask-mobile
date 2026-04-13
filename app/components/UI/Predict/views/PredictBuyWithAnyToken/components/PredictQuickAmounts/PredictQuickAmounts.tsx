import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import React from 'react';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';

const QUICK_AMOUNTS = [20, 50, 100, 250] as const;

interface PredictQuickAmountsProps {
  onSelectAmount: (amount: number) => void;
  disabled?: boolean;
}

function PredictQuickAmounts({
  onSelectAmount,
  disabled = false,
}: PredictQuickAmountsProps) {
  const tw = useTailwind();

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 py-2">
      {QUICK_AMOUNTS.map((amount) => (
        <Button
          key={amount}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label={`$${amount}`}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            onSelectAmount(amount);
          }}
          isDisabled={disabled}
          style={tw.style('flex-1 h-12')}
        />
      ))}
    </Box>
  );
}

export default PredictQuickAmounts;
