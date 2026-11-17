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
  /** Hides the decimal-point key for integer-only entry, as in sell mode. */
  showsDecimalKey?: boolean;
  /** Puts the period and delete keys on the same filled tile as the digits
   * (the buy sheet); otherwise they sit on a transparent tile. */
  hasFilledActionKeys?: boolean;
  /** The keypad's test ID; each key's is `${testID}-key-${key}`. Defaults to
   * the Order Flow's. */
  testID?: string;
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
 * keypad overrides the variant's bold default with font-medium). The period
 * and backspace keys are bare unless `hasFilledActionKeys` is set.
 */
export const OrderKeypad = ({
  onKeyPress,
  onDelete,
  showsDecimalKey = true,
  hasFilledActionKeys = false,
  testID = PredictOrderFlowTestIds.KEYPAD,
}: OrderKeypadProps) => (
  <Box testID={testID} twClassName="gap-3 px-4 py-4">
    {DIGIT_ROWS.map((row) => (
      <Box key={row.join('')} twClassName="flex-row gap-3">
        {row.map((digit) => (
          <Key
            key={digit}
            testID={`${testID}-key-${digit}`}
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
      {showsDecimalKey ? (
        <Key
          isPlain={!hasFilledActionKeys}
          testID={`${testID}-key-.`}
          onPress={() => onKeyPress('.')}
        >
          <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Medium}>
            .
          </Text>
        </Key>
      ) : (
        // Keeps the grid positions of the remaining keys unchanged.
        <Box twClassName="h-12 flex-1" />
      )}
      <Key testID={`${testID}-key-0`} onPress={() => onKeyPress('0')}>
        <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Medium}>
          0
        </Text>
      </Key>
      <Key
        isPlain={!hasFilledActionKeys}
        testID={`${testID}-key-delete`}
        onPress={onDelete}
        accessibilityLabel={strings('predict_next.order_preview.delete')}
      >
        <Icon name={IconName.Backspace} size={IconSize.Xl} />
      </Key>
    </Box>
  </Box>
);
