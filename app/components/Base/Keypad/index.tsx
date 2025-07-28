import React, { useCallback } from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import Keypad from './components';
import { Keys } from './constants';
import useCurrency from './useCurrency';

interface KeypadChangeData {
  value: string;
  valueAsNumber: number;
  pressedKey: Keys;
}

interface KeypadComponentProps {
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
   * Custom style for container
   */
  style?: ViewStyle | ViewStyle[];
  /**
   * Custom style for digit buttons
   */
  digitButtonStyle?: ViewStyle | ViewStyle[];
  /**
   * Custom style for digit text
   */
  digitTextStyle?: TextStyle | TextStyle[];
  /**
   * Custom style for period button
   */
  periodButtonStyle?: ViewStyle | ViewStyle[];
  /**
   * Custom style for period text
   */
  periodTextStyle?: TextStyle | TextStyle[];
  /**
   * Custom style for delete button
   */
  deleteButtonStyle?: ViewStyle | ViewStyle[];
  /**
   * Custom icon for delete button
   */
  deleteIcon?: React.ReactNode;
}

function KeypadComponent({
  onChange,
  value,
  currency,
  decimals,
  style,
  digitButtonStyle,
  digitTextStyle,
  periodButtonStyle,
  periodTextStyle,
  deleteButtonStyle,
  deleteIcon,
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
    <Keypad style={style}>
      <Keypad.Row>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress1}
          accessibilityRole="button"
          accessible
        >
          1
        </Keypad.Button>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress2}
          accessibilityRole="button"
          accessible
        >
          2
        </Keypad.Button>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress3}
          accessibilityRole="button"
          accessible
        >
          3
        </Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress4}
          accessibilityRole="button"
          accessible
        >
          4
        </Keypad.Button>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress5}
          accessibilityRole="button"
          accessible
        >
          5
        </Keypad.Button>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress6}
          accessibilityRole="button"
          accessible
        >
          6
        </Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress7}
          accessibilityRole="button"
          accessible
        >
          7
        </Keypad.Button>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress8}
          accessibilityRole="button"
          accessible
        >
          8
        </Keypad.Button>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress9}
          accessibilityRole="button"
          accessible
        >
          9
        </Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button
          style={periodButtonStyle}
          textStyle={periodTextStyle}
          onPress={handleKeypadPressPeriod}
        >
          {decimalSeparator}
        </Keypad.Button>
        <Keypad.Button
          style={digitButtonStyle}
          textStyle={digitTextStyle}
          onPress={handleKeypadPress0}
          accessibilityRole="button"
          accessible
        >
          0
        </Keypad.Button>
        <Keypad.DeleteButton
          testID="keypad-delete-button"
          style={deleteButtonStyle}
          icon={deleteIcon}
          onPress={handleKeypadPressBack}
          onLongPress={handleKeypadLongPressBack}
          delayLongPress={500}
        />
      </Keypad.Row>
    </Keypad>
  );
}

export { Keys };
export type { KeypadChangeData, KeypadComponentProps };
export default KeypadComponent;
