import {
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
} from 'react-native';
import { regex } from '../../../../app/util/regex';
import { Keys } from './constants';

interface KeypadRuleConfig {
  decimalSeparator?: string | null;
  decimals?: number | null;
}

export default function createKeypadRule({
  decimalSeparator = null,
  decimals = null,
}: KeypadRuleConfig = {}): (
  currentAmount: string,
  inputKey: Keys,
  cursorSelection?: NativeSyntheticEvent<TextInputSelectionChangeEventData>['nativeEvent']['selection'],
) => string {
  return function handler(
    currentAmount: string,
    inputKey: Keys,
    cursorSelection?: NativeSyntheticEvent<TextInputSelectionChangeEventData>['nativeEvent']['selection'],
  ): string {
    if (!currentAmount) {
      currentAmount = '0';
    }

    // Use cursor position if provided, otherwise default to end of string
    const cursor = cursorSelection ?? {
      start: currentAmount.length,
      end: currentAmount.length,
    };

    switch (inputKey) {
      case Keys.Period: {
        if (!decimalSeparator || decimals === 0) {
          return currentAmount;
        }

        if (currentAmount.includes(decimalSeparator)) {
          return currentAmount;
        }

        if (cursorSelection === undefined) {
          return `${currentAmount}${decimalSeparator}`;
        }

        return (
          currentAmount.slice(0, cursor.start) +
          decimalSeparator +
          currentAmount.slice(cursor.end)
        );
      }
      case Keys.Back: {
        if (currentAmount === '0') {
          return currentAmount;
        }
        if (regex.hasOneDigit.test(currentAmount)) {
          return '0';
        }

        if (cursorSelection === undefined) {
          return currentAmount.slice(0, -1);
        }

        return (
          currentAmount.slice(0, cursor.start - 1) +
          currentAmount.slice(cursor.end)
        );
      }
      case Keys.Initial: {
        return '0';
      }
      case Keys.Digit0:
      case Keys.Digit1:
      case Keys.Digit2:
      case Keys.Digit3:
      case Keys.Digit4:
      case Keys.Digit5:
      case Keys.Digit6:
      case Keys.Digit7:
      case Keys.Digit8:
      case Keys.Digit9: {
        if (currentAmount === '0') {
          return inputKey;
        }

        if (decimalSeparator && typeof decimals === 'number' && decimals > 0) {
          // Count current decimal places
          const parts = currentAmount.split(decimalSeparator);
          if (parts.length === 2 && parts[1].length >= decimals) {
            return currentAmount; // Block if already at max decimals
          }
        }

        if (cursorSelection === undefined) {
          return `${currentAmount}${inputKey}`;
        }

        return (
          currentAmount.slice(0, cursor.start) +
          inputKey +
          currentAmount.slice(cursor.end)
        );
      }
      default: {
        return currentAmount;
      }
    }
  };
}

export type { KeypadRuleConfig };
