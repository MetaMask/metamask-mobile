import { KEYS } from './constants';

const hasOneDigit = /^\d$/;
function hasDecimals(separator, decimalPlaces) {
  return new RegExp(`^\\d+\\${separator}\\d{${decimalPlaces}}$`, 'g');
}

export default function createKeypadRule({
  decimalSeparator = null,
  decimals = null,
} = {}) {
  return function handler(currentAmount, inputKey) {
    if (!currentAmount) {
      currentAmount = '0';
    }

    switch (inputKey) {
      case KEYS.PERIOD: {
        if (!decimalSeparator || decimals === 0 || decimals === false) {
          return currentAmount;
        }

        if (currentAmount.includes(decimalSeparator)) {
          return currentAmount;
        }

        return `${currentAmount}${decimalSeparator}`;
      }
      case KEYS.BACK: {
        if (currentAmount === '0') {
          return currentAmount;
        }
        if (hasOneDigit.test(currentAmount)) {
          return '0';
        }

        return currentAmount.slice(0, -1);
      }
      case KEYS.INITIAL: {
        return '0';
      }
      case KEYS.DIGIT_0:
      case KEYS.DIGIT_1:
      case KEYS.DIGIT_2:
      case KEYS.DIGIT_3:
      case KEYS.DIGIT_4:
      case KEYS.DIGIT_5:
      case KEYS.DIGIT_6:
      case KEYS.DIGIT_7:
      case KEYS.DIGIT_8:
      case KEYS.DIGIT_9: {
        if (currentAmount === '0') {
          return inputKey;
        }

        if (hasDecimals(decimalSeparator, decimals).test(currentAmount)) {
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
