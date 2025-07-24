import { regex, hasDecimals } from '../../../../app/util/regex';
import { Keys } from './constants';

interface KeypadRuleConfig {
  decimalSeparator?: string | null;
  decimals?: number | null;
}

export default function createKeypadRule({
  decimalSeparator = null,
  decimals = null,
}: KeypadRuleConfig = {}): (currentAmount: string, inputKey: string) => string {
  return function handler(currentAmount: string, inputKey: string): string {
    if (!currentAmount) {
      currentAmount = '0';
    }

    switch (inputKey) {
      case Keys.Period: {
        if (!decimalSeparator || decimals === 0) {
          return currentAmount;
        }

        if (currentAmount.includes(decimalSeparator)) {
          return currentAmount;
        }

        return `${currentAmount}${decimalSeparator}`;
      }
      case Keys.Back: {
        if (currentAmount === '0') {
          return currentAmount;
        }
        if (regex.hasOneDigit.test(currentAmount)) {
          return '0';
        }

        return currentAmount.slice(0, -1);
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

        if (
          decimalSeparator &&
          decimals !== null &&
          hasDecimals(decimalSeparator, decimals.toString()).test(currentAmount)
        ) {
          return currentAmount;
        }

        return `${currentAmount}${inputKey}`;
      }
      default: {
        return currentAmount;
      }
    }
  };
}

export type { KeypadRuleConfig };
