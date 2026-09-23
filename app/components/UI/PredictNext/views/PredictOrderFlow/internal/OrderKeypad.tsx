import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

interface OrderKeypadProps {
  /** Called with the pressed digit or decimal-point key. */
  onKeyPress: (key: string) => void;
  /** Removes the last character of the amount. */
  onDelete: () => void;
}

interface KeyProps {
  testID: string;
  onPress: () => void;
  /** The period and delete keys sit on a transparent tile, like Base/Keypad. */
  isPlain?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
}

const Key = ({
  testID,
  onPress,
  isPlain = false,
  accessibilityLabel,
  children,
}: KeyProps) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) =>
        tw.style(
          'h-12 flex-1 items-center justify-center rounded-xl',
          !isPlain && (pressed ? 'bg-pressed' : 'bg-muted'),
        )
      }
    >
      {children}
    </Pressable>
  );
};

/**
 * The in-sheet numeric keypad, styled after the legacy Base/Keypad: muted
 * 48px tiles on a 12px grid, DisplayMd labels at medium weight (the legacy
 * keypad overrides the variant's bold default with font-medium), a bare
 * period key and a bare backspace key.
 */
export const OrderKeypad = ({ onKeyPress, onDelete }: OrderKeypadProps) => (
  <Box testID={PredictOrderFlowTestIds.KEYPAD} twClassName="gap-3 px-4 py-4">
    {DIGIT_ROWS.map((row) => (
      <Box key={row.join('')} twClassName="flex-row gap-3">
        {row.map((digit) => (
          <Key
            key={digit}
            testID={PredictOrderFlowTestIds.KEYPAD_KEY(digit)}
            onPress={() => onKeyPress(digit)}
          >
            <Text
              variant={TextVariant.DisplayMd}
              fontWeight={FontWeight.Medium}
            >
              {digit}
            </Text>
          </Key>
        ))}
      </Box>
    ))}
    <Box twClassName="flex-row gap-3">
      <Key
        isPlain
        testID={PredictOrderFlowTestIds.KEYPAD_KEY('.')}
        onPress={() => onKeyPress('.')}
      >
        <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Medium}>
          .
        </Text>
      </Key>
      <Key
        testID={PredictOrderFlowTestIds.KEYPAD_KEY('0')}
        onPress={() => onKeyPress('0')}
      >
        <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Medium}>
          0
        </Text>
      </Key>
      <Key
        isPlain
        testID={PredictOrderFlowTestIds.KEYPAD_KEY('delete')}
        onPress={onDelete}
        accessibilityLabel={strings('predict_next.order_preview.delete')}
      >
        <Icon name={IconName.Backspace} size={IconSize.Xl} />
      </Key>
    </Box>
  </Box>
);
