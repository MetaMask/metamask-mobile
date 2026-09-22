import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

interface OrderAmountInputProps {
  amount: string;
  /** Shows the blinking caret while the keypad is open. */
  isActive: boolean;
  /** Opens the in-sheet keypad. */
  onAmountPress: () => void;
  /** Blocks keypad open while a quote is being submitted. */
  isDisabled?: boolean;
}

/** Legacy PredictAmountDisplay sizing: shrink as the figure grows. */
const fontSizeFor = (length: number) => {
  if (length <= 8) return 60;
  if (length <= 10) return 48;
  if (length <= 12) return 32;
  return 24;
};

/**
 * USD amount entry: the big centered figure with a caret while the
 * keypad is open, matching the legacy Predict amount display. The caret
 * is deliberately static: animated carets (native-driver Animated.loop or
 * Reanimated withRepeat) deadlock the main thread inside the worklets
 * frame pipeline when this sheet mounts.
 */
export const OrderAmountInput = ({
  amount,
  isActive,
  onAmountPress,
  isDisabled = false,
}: OrderAmountInputProps) => {
  const tw = useTailwind();

  const label = `$${amount || '0'}`;
  const fontSize = fontSizeFor(label.length);

  return (
    <Pressable
      onPress={isDisabled ? undefined : onAmountPress}
      disabled={isDisabled}
      testID={PredictOrderFlowTestIds.AMOUNT_INPUT}
      accessibilityRole="button"
      accessibilityLabel={strings('predict_next.order_preview.amount')}
    >
      <Box twClassName="flex-row items-center justify-center px-6">
        <Text
          variant={TextVariant.DisplayMd}
          color={amount ? TextColor.TextDefault : TextColor.TextAlternative}
          twClassName={`text-[${fontSize}px] leading-[${fontSize + 10}px] tracking-tight px-1`}
        >
          {label}
        </Text>
        {isActive ? (
          <View
            style={tw.style(
              `w-0.5 h-[${Math.round(fontSize * 0.72)}px] bg-text-default`,
            )}
          />
        ) : null}
      </Box>
    </Pressable>
  );
};
