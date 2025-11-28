import React, { memo, useCallback, useMemo } from 'react';
import KeypadComponent, { KeypadChangeData } from '../../../../Base/Keypad';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './deposit-keyboard.styles';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { Box } from '../../../../UI/Box/Box';
import { FlexDirection, JustifyContent } from '../../../../UI/Box/box.types';
import { strings } from '../../../../../../locales/i18n';
import { View } from 'react-native';
import { PERPS_CURRENCY } from '../../constants/perps';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import Keypad from '../../../../Base/Keypad/components';
import { noop } from 'lodash';

const PERCENTAGE_BUTTONS = [
  {
    label: '10%',
    value: 10,
  },
  {
    label: '25%',
    value: 25,
  },
  {
    label: '50%',
    value: 50,
  },
  {
    label: '90%',
    value: 90,
  },
];

const MAX_BUTTON = {
  label: 'Max',
  value: 100,
};

export interface DepositKeyboardProps {
  alertMessage?: string;
  doneLabel?: string;
  hasInput?: boolean;
  hasMax?: boolean;
  onChange: (value: string) => void;
  onPercentagePress: (percentage: number) => void;
  onDonePress: () => void;
  value: string;
}

export const DepositKeyboard = memo(
  ({
    alertMessage,
    doneLabel,
    hasInput,
    hasMax,
    onChange,
    onDonePress,
    onPercentagePress,
    value,
  }: DepositKeyboardProps) => {
    const currentCurrency = PERPS_CURRENCY;
    const { styles } = useStyles(styleSheet, {});
    const valueString = value.toString();

    const handleChange = useCallback(
      (data: KeypadChangeData) => {
        onChange(data.value);
      },
      [onChange],
    );

    const handlePercentagePress = useCallback(
      (percentage: number) => {
        onPercentagePress(percentage);
      },
      [onPercentagePress],
    );

    const buttons = useMemo(() => {
      const newButtons = [...PERCENTAGE_BUTTONS];

      if (hasMax) {
        newButtons.pop();
        newButtons.push(MAX_BUTTON);
      }

      return newButtons;
    }, [hasMax]);

    return (
      <View>
        <Box
          testID="deposit-keyboard"
          flexDirection={FlexDirection.Row}
          justifyContent={JustifyContent.spaceBetween}
          gap={10}
        >
          {alertMessage && (
            <Button
              testID="deposit-keyboard-alert"
              label={alertMessage}
              style={[styles.button, styles.disabledButton]}
              onPress={noop}
              disabled
              variant={ButtonVariants.Primary}
            />
          )}
          {!alertMessage &&
            !hasInput &&
            buttons.map(({ label, value: buttonValue }) => (
              <Button
                key={buttonValue}
                label={label}
                style={styles.button}
                onPress={() => handlePercentagePress(buttonValue)}
                variant={ButtonVariants.Secondary}
              />
            ))}
          {!alertMessage && hasInput && (
            <Button
              testID="deposit-keyboard-done-button"
              label={doneLabel ?? strings('confirm.edit_amount_done')}
              style={styles.button}
              onPress={onDonePress}
              variant={ButtonVariants.Primary}
            />
          )}
        </Box>
        <KeypadComponent
          value={valueString}
          onChange={handleChange}
          currency={currentCurrency}
          decimals={2}
        />
      </View>
    );
  },
);

export function DepositKeyboardSkeleton() {
  return (
    <Keypad>
      <DepositKeyboardSkeletonRow count={4} />
      <DepositKeyboardSkeletonRow />
      <DepositKeyboardSkeletonRow />
      <DepositKeyboardSkeletonRow />
      <DepositKeyboardSkeletonRow />
    </Keypad>
  );
}

function DepositKeyboardSkeletonRow({ count = 3 }) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Keypad.Row>
      {[...Array(count)].map((_, index) => (
        <Skeleton key={index} style={styles.skeletonButton} />
      ))}
    </Keypad.Row>
  );
}
