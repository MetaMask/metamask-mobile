import React from 'react';
import {
  Box,
  ButtonBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextButton,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';

import { PredictOrderFlowTestIds } from './PredictOrderFlow.testIds';

/** The digit keys, laid out as three-column rows. */
const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;
/** The bottom row: decimal point and zero flank the delete key. */
const LAST_ROW_KEYS = ['.', '0'] as const;

interface OrderKeypadProps {
  /** Called with the pressed digit or decimal-point key. */
  onKeyPress: (key: string) => void;
  /** Removes the last character of the amount. */
  onDelete: () => void;
  /** Collapses the keypad, revealing the summary and the Confirm button. */
  onDone: () => void;
}

const keyTwClassName = (pressed: boolean) =>
  `h-14 flex-1 rounded-none ${pressed ? 'bg-muted' : 'bg-transparent'}`;

const OrderKeypadKey = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => (
  <ButtonBase
    twClassName={keyTwClassName}
    onPress={onPress}
    testID={PredictOrderFlowTestIds.KEYPAD_KEY(label)}
  >
    <Text twClassName="text-[24px] font-medium leading-8 text-default">
      {label}
    </Text>
  </ButtonBase>
);

/**
 * The in-sheet numeric keypad for the USD amount entry, replacing the OS
 * keyboard. Purely presentational: the parent owns and sanitizes the amount.
 */
export const OrderKeypad = ({
  onKeyPress,
  onDelete,
  onDone,
}: OrderKeypadProps) => (
  <Box testID={PredictOrderFlowTestIds.KEYPAD}>
    <Box twClassName="items-end">
      <TextButton onPress={onDone} testID={PredictOrderFlowTestIds.KEYPAD_DONE}>
        {strings('predict_next.order_preview.done')}
      </TextButton>
    </Box>
    <Box twClassName="gap-2">
      {DIGIT_ROWS.map((row) => (
        <Box key={row.join('')} twClassName="flex-row gap-2">
          {row.map((digit) => (
            <OrderKeypadKey
              key={digit}
              label={digit}
              onPress={() => onKeyPress(digit)}
            />
          ))}
        </Box>
      ))}
      <Box twClassName="flex-row gap-2">
        {LAST_ROW_KEYS.map((key) => (
          <OrderKeypadKey
            key={key}
            label={key}
            onPress={() => onKeyPress(key)}
          />
        ))}
        <ButtonBase
          twClassName={keyTwClassName}
          onPress={onDelete}
          testID={PredictOrderFlowTestIds.KEYPAD_KEY('delete')}
          accessibilityLabel={strings('predict_next.order_preview.delete')}
        >
          <Icon
            name={IconName.Backspace}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
          />
        </ButtonBase>
      </Box>
    </Box>
  </Box>
);
