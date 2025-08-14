import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Keypad, {
  type KeypadButtonProps,
  type KeypadContainerProps,
  type KeypadDeleteButtonProps,
} from './components';
import { Keys } from './constants';
import useCurrency from './useCurrency';
import { colors } from '../../../styles/common';

const styles = StyleSheet.create({
  periodButton: {
    backgroundColor: colors.transparent,
  },
});

interface KeypadChangeData {
  value: string;
  valueAsNumber: number;
  pressedKey: Keys;
}

interface KeypadComponentProps extends Omit<KeypadContainerProps, 'children'> {
  /**
   * Function that will be called when a key is pressed with arguments `(value, key)`
   */
  onChange: (data: KeypadChangeData) => void;
  /**
   * Currency code for the keypad rules and symbols. Defaults to
   * currency without decimals (CURRENCIES[default])
   */
  currency?: string;
  /**
   * Currency decimals
   */
  decimals?: number;
  /**
   * Current value used to create new value when a key is pressed.
   */
  value: string;
  /**
   * Props for the period button
   */
  periodButtonProps?: Partial<KeypadButtonProps>;
  /**
   * Props for the delete button
   */
  deleteButtonProps?: Partial<KeypadDeleteButtonProps>;
}

function KeypadComponent({
  onChange,
  value,
  currency,
  decimals,
  periodButtonProps,
  deleteButtonProps,
  ...props
}: KeypadComponentProps): React.JSX.Element {
  const { handler, decimalSeparator } = useCurrency(currency, decimals);

  const handleKeypadPress = useCallback(
    (pressedKey: Keys) => {
      const newValue = handler(value, pressedKey);
      let valueAsNumber = 0;
      try {
        valueAsNumber = decimalSeparator
          ? Number(newValue.replace(decimalSeparator, '.'))
          : Number(newValue);
      } catch (error) {
        console.error(error);
      }
      onChange({ value: newValue, valueAsNumber, pressedKey });
    },
    [decimalSeparator, handler, onChange, value],
  );

  const handleKeypadPress1 = useCallback(
    () => handleKeypadPress(Keys.Digit1),
    [handleKeypadPress],
  );
  const handleKeypadPress2 = useCallback(
    () => handleKeypadPress(Keys.Digit2),
    [handleKeypadPress],
  );
  const handleKeypadPress3 = useCallback(
    () => handleKeypadPress(Keys.Digit3),
    [handleKeypadPress],
  );
  const handleKeypadPress4 = useCallback(
    () => handleKeypadPress(Keys.Digit4),
    [handleKeypadPress],
  );
  const handleKeypadPress5 = useCallback(
    () => handleKeypadPress(Keys.Digit5),
    [handleKeypadPress],
  );
  const handleKeypadPress6 = useCallback(
    () => handleKeypadPress(Keys.Digit6),
    [handleKeypadPress],
  );
  const handleKeypadPress7 = useCallback(
    () => handleKeypadPress(Keys.Digit7),
    [handleKeypadPress],
  );
  const handleKeypadPress8 = useCallback(
    () => handleKeypadPress(Keys.Digit8),
    [handleKeypadPress],
  );
  const handleKeypadPress9 = useCallback(
    () => handleKeypadPress(Keys.Digit9),
    [handleKeypadPress],
  );
  const handleKeypadPress0 = useCallback(
    () => handleKeypadPress(Keys.Digit0),
    [handleKeypadPress],
  );
  const handleKeypadPressPeriod = useCallback(
    () => decimalSeparator && handleKeypadPress(Keys.Period),
    [decimalSeparator, handleKeypadPress],
  );
  const handleKeypadPressBack = useCallback(
    () => handleKeypadPress(Keys.Back),
    [handleKeypadPress],
  );
  const handleKeypadLongPressBack = useCallback(
    () => handleKeypadPress(Keys.Initial),
    [handleKeypadPress],
  );

  return (
    <Keypad {...props}>
      <Keypad.Row>
        <Keypad.Button onPress={handleKeypadPress1}>1</Keypad.Button>
        <Keypad.Button onPress={handleKeypadPress2}>2</Keypad.Button>
        <Keypad.Button onPress={handleKeypadPress3}>3</Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button onPress={handleKeypadPress4}>4</Keypad.Button>
        <Keypad.Button onPress={handleKeypadPress5}>5</Keypad.Button>
        <Keypad.Button onPress={handleKeypadPress6}>6</Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button onPress={handleKeypadPress7}>7</Keypad.Button>
        <Keypad.Button onPress={handleKeypadPress8}>8</Keypad.Button>
        <Keypad.Button onPress={handleKeypadPress9}>9</Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button
          onPress={handleKeypadPressPeriod}
          style={styles.periodButton}
          {...periodButtonProps}
        >
          {decimalSeparator}
        </Keypad.Button>
        <Keypad.Button onPress={handleKeypadPress0}>0</Keypad.Button>
        <Keypad.DeleteButton
          testID="keypad-delete-button"
          onPress={handleKeypadPressBack}
          onLongPress={handleKeypadLongPressBack}
          delayLongPress={500}
          {...deleteButtonProps}
        />
      </Keypad.Row>
    </Keypad>
  );
}

export { Keys };
export type { KeypadChangeData, KeypadComponentProps };
export default KeypadComponent;
