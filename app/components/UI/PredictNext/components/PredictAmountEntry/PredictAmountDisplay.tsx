import React from 'react';
import { Pressable, View } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { PredictAmountEntryTestIds } from './PredictAmountEntry.testIds';

interface PredictAmountDisplayProps {
  amount: string;
  /** Shows the caret while the keypad is open. */
  isActive: boolean;
  /** Opens the keypad where the flow keeps it closed until tapped. A flow
   * whose keypad is always open omits it and the figure is inert. */
  onAmountPress?: () => void;
  /** Blocks opening the keypad while a quote is being submitted. */
  isDisabled?: boolean;
  /** Rendered before the figure: '$' for USD amounts, '' for contracts. */
  prefix?: string;
  accessibilityLabel: string;
}

/** Legacy PredictAmountDisplay sizing: shrink as the figure grows. */
const fontSizeFor = (length: number) => {
  if (length <= 8) return 60;
  if (length <= 10) return 48;
  if (length <= 12) return 32;
  return 24;
};

/**
 * The big centered figure with a caret while the keypad is open, matching
 * the legacy Predict amount display: a USD amount for a buy or a Withdrawal,
 * a contract count for a sell. The caret is deliberately static: animated
 * carets (native-driver Animated.loop or Reanimated withRepeat) deadlock the
 * main thread inside the worklets frame pipeline when a flow sheet mounts.
 */
export const PredictAmountDisplay = ({
  amount,
  isActive,
  onAmountPress,
  isDisabled = false,
  prefix = '$',
  accessibilityLabel,
}: PredictAmountDisplayProps) => {
  const tw = useTailwind();

  const label = `${prefix}${amount || '0'}`;
  const fontSize = fontSizeFor(label.length);

  const figure = (
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
  );

  // The figure is an output, not an input: without the value, a grouped
  // accessible element announces only its label and the entered digits are
  // absent from the accessibility tree.
  const accessibilityValue = { text: label };

  if (!onAmountPress) {
    return (
      <Box
        accessible
        testID={PredictAmountEntryTestIds.DISPLAY}
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={accessibilityValue}
      >
        {figure}
      </Box>
    );
  }

  return (
    <Pressable
      onPress={isDisabled ? undefined : onAmountPress}
      disabled={isDisabled}
      testID={PredictAmountEntryTestIds.DISPLAY}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityValue}
    >
      {figure}
    </Pressable>
  );
};
