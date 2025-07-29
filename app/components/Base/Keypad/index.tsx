import React, { useCallback, useMemo, memo } from 'react';
import Keypad, {
  type KeypadButtonProps,
  type KeypadContainerProps,
  type KeypadDeleteButtonProps,
} from './components';
import { Keys } from './constants';
import useCurrency from './useCurrency';

interface KeypadChangeData {
  value: string;
  valueAsNumber: number;
  pressedKey: Keys;
}

interface KeypadComponentProps extends KeypadContainerProps {
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

  const buttonHandlers = useMemo(
    () => ({
      digit1: () => handleKeypadPress(Keys.Digit1),
      digit2: () => handleKeypadPress(Keys.Digit2),
      digit3: () => handleKeypadPress(Keys.Digit3),
      digit4: () => handleKeypadPress(Keys.Digit4),
      digit5: () => handleKeypadPress(Keys.Digit5),
      digit6: () => handleKeypadPress(Keys.Digit6),
      digit7: () => handleKeypadPress(Keys.Digit7),
      digit8: () => handleKeypadPress(Keys.Digit8),
      digit9: () => handleKeypadPress(Keys.Digit9),
      digit0: () => handleKeypadPress(Keys.Digit0),
      period: () => decimalSeparator && handleKeypadPress(Keys.Period),
      back: () => handleKeypadPress(Keys.Back),
      longBack: () => handleKeypadPress(Keys.Initial),
    }),
    [handleKeypadPress, decimalSeparator],
  );

  return (
    <Keypad {...props}>
      <Keypad.Row>
        <Keypad.Button onPress={buttonHandlers.digit1}>1</Keypad.Button>
        <Keypad.Button onPress={buttonHandlers.digit2}>2</Keypad.Button>
        <Keypad.Button onPress={buttonHandlers.digit3}>3</Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button onPress={buttonHandlers.digit4}>4</Keypad.Button>
        <Keypad.Button onPress={buttonHandlers.digit5}>5</Keypad.Button>
        <Keypad.Button onPress={buttonHandlers.digit6}>6</Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button onPress={buttonHandlers.digit7}>7</Keypad.Button>
        <Keypad.Button onPress={buttonHandlers.digit8}>8</Keypad.Button>
        <Keypad.Button onPress={buttonHandlers.digit9}>9</Keypad.Button>
      </Keypad.Row>
      <Keypad.Row>
        <Keypad.Button
          onPress={buttonHandlers.period}
          twClassName={(pressed: boolean) =>
            `bg-transparent ${pressed && 'bg-pressed'}`
          }
          {...periodButtonProps}
        >
          {decimalSeparator}
        </Keypad.Button>
        <Keypad.Button onPress={buttonHandlers.digit0}>0</Keypad.Button>
        <Keypad.DeleteButton
          testID="keypad-delete-button"
          onPress={buttonHandlers.back}
          onLongPress={buttonHandlers.longBack}
          delayLongPress={500}
          {...deleteButtonProps}
        />
      </Keypad.Row>
    </Keypad>
  );
}

const MemoizedKeypadComponent = memo(KeypadComponent);
MemoizedKeypadComponent.displayName = 'KeypadComponent';

export { Keys };
export type { KeypadChangeData, KeypadComponentProps };
export default MemoizedKeypadComponent;
