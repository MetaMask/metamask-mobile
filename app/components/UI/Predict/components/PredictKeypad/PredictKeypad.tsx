import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Keypad from '../../../../Base/Keypad';
import { strings } from '../../../../../../locales/i18n';

interface PredictKeypadProps {
  isInputFocused: boolean;
  currentValue: number;
  currentValueUSDString: string;
  setCurrentValue: (value: number) => void;
  setCurrentValueUSDString: (value: string) => void;
  setIsInputFocused: (focused: boolean) => void;
  hasInsufficientFunds?: boolean;
  onAddFunds?: () => void;
}

export interface PredictKeypadHandles {
  handleAmountPress: () => void;
  handleKeypadAmountPress: (amount: number) => void;
  handleDonePress: () => void;
}

const PredictKeypad = forwardRef<PredictKeypadHandles, PredictKeypadProps>(
  (
    {
      isInputFocused,
      currentValue,
      currentValueUSDString,
      setCurrentValue,
      setCurrentValueUSDString,
      setIsInputFocused,
      hasInsufficientFunds = false,
      onAddFunds,
    },
    ref,
  ) => {
    const tw = useTailwind();

    const handleAmountPress = useCallback(() => {
      setIsInputFocused(true);
    }, [setIsInputFocused]);

    const handleKeypadAmountPress = useCallback(
      (amount: number) => {
        setCurrentValue(amount);
        setCurrentValueUSDString(amount.toString());
      },
      [setCurrentValue, setCurrentValueUSDString],
    );

    const handleDonePress = useCallback(() => {
      // Clean up trailing decimal point if user finished with just a dot
      let cleanedValue = currentValueUSDString;
      if (cleanedValue.endsWith('.')) {
        cleanedValue = cleanedValue.slice(0, -1);
        setCurrentValueUSDString(cleanedValue);
        setCurrentValue(parseFloat(cleanedValue) || 0);
      }
      setIsInputFocused(false);
    }, [
      setIsInputFocused,
      currentValueUSDString,
      setCurrentValueUSDString,
      setCurrentValue,
    ]);

    useImperativeHandle(ref, () => ({
      handleAmountPress,
      handleKeypadAmountPress,
      handleDonePress,
    }));

    const handleKeypadChange = useCallback(
      ({ value }: { value: string; valueAsNumber: number }) => {
        const previousValue = currentValue.toString();
        // Special handling for decimal point deletion
        // If previous value had a decimal and new value is the same, force remove the decimal
        let adjustedValue = value;

        // Check if we're stuck on a decimal (e.g., "2." -> "2." means delete didn't work)
        if (previousValue.endsWith('.') && value === previousValue) {
          adjustedValue = value.slice(0, -1);
        }
        // Also handle case where decimal is in middle (e.g., "2.5" -> "2." should become "25")
        else if (
          previousValue.includes('.') &&
          value.endsWith('.') &&
          value.length === previousValue.length - 1
        ) {
          // User deleted a digit after decimal, remove the decimal too
          adjustedValue = value.replace('.', '');
        }

        // Set focus flag immediately
        if (!isInputFocused) {
          setIsInputFocused(true);
        }

        // Enforce 9-digit limit (ignoring non-digits). Block the change if exceeded.
        const digitCount = (adjustedValue.match(/\d/g) || []).length;
        if (digitCount > 9) {
          return; // Ignore input that would exceed 9 digits
        }

        // For USD mode, preserve user input exactly as typed for proper delete operations
        // Only limit decimal places if there are digits after the decimal point
        let formattedUSDString = adjustedValue;
        if (adjustedValue.includes('.')) {
          const parts = adjustedValue.split('.');
          const integerPart = parts[0] || '';
          const decimalPart = parts[1] || '';

          // If there's a decimal part, limit it to 2 digits
          if (decimalPart.length > 0) {
            formattedUSDString = integerPart + '.' + decimalPart.slice(0, 2);
          } else {
            // Keep the decimal point if user just typed it (like "2.")
            formattedUSDString = integerPart + '.';
          }
        }

        // Update all states in batch to prevent race conditions
        setCurrentValueUSDString(formattedUSDString);
        // parseFloat handles "2." correctly (returns 2), and handles empty/"." as NaN
        const numericValue = parseFloat(formattedUSDString);
        setCurrentValue(isNaN(numericValue) ? 0 : numericValue);
      },
      [
        currentValue,
        isInputFocused,
        setCurrentValue,
        setCurrentValueUSDString,
        setIsInputFocused,
      ],
    );

    if (!isInputFocused) return null;

    return (
      <View style={tw.style('py-4')}>
        <View style={tw.style('px-4 mb-3')}>
          {hasInsufficientFunds && onAddFunds ? (
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              label={strings('predict.deposit.add_funds')}
              onPress={onAddFunds}
              style={tw.style('w-full')}
            />
          ) : (
            <View style={tw.style('flex-row space-between gap-2')}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Md}
                label="$20"
                onPress={() => handleKeypadAmountPress(20)}
                style={tw.style('flex-1 h-12')}
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Md}
                label="$50"
                onPress={() => handleKeypadAmountPress(50)}
                style={tw.style('flex-1 h-12')}
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Md}
                label="$100"
                onPress={() => handleKeypadAmountPress(100)}
                style={tw.style('flex-1 h-12')}
              />
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Md}
                label="Done"
                onPress={handleDonePress}
                style={tw.style('flex-1 h-12')}
              />
            </View>
          )}
        </View>
        <Keypad
          value={currentValueUSDString}
          onChange={handleKeypadChange}
          currency={'USD'}
          decimals={2}
          style={tw.style('px-4')}
        />
      </View>
    );
  },
);

PredictKeypad.displayName = 'PredictKeypad';

export default PredictKeypad;
