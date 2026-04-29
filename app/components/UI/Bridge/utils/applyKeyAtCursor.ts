import clamp from 'lodash/clamp';
import { Keys } from '../../../Base/Keypad';
import { regex } from '../../../../util/regex';

const normalizeLeadingDecimal = (
  value: string,
  cursorPosition: number,
): { value: string; cursorPosition: number } =>
  // Raw values always use "0.x" instead of ".x" so downstream parsing and
  // cursor math operate on one canonical shape.
  value.startsWith('.')
    ? { value: `0${value}`, cursorPosition: cursorPosition + 1 }
    : { value, cursorPosition };

const normalizeLeadingZeros = (
  value: string,
  cursorPosition: number,
): { value: string; cursorPosition: number } => {
  const decimalIndex = value.indexOf('.');
  const integerPart =
    decimalIndex === -1 ? value : value.slice(0, decimalIndex);
  const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/u, '');
  const removedCount = integerPart.length - normalizedIntegerPart.length;

  if (removedCount === 0) {
    return { value, cursorPosition };
  }

  const normalizedValue =
    normalizedIntegerPart +
    (decimalIndex === -1 ? '' : value.slice(decimalIndex));

  return {
    // Removing leading zeros can shift the visual cursor left. Keep the raw
    // cursor aligned with the surviving characters.
    value: normalizedValue,
    cursorPosition: cursorPosition - Math.min(cursorPosition, removedCount),
  };
};

const normalizeValue = (
  value: string,
  cursorPosition: number,
): { value: string; cursorPosition: number } => {
  const normalizedDecimal = normalizeLeadingDecimal(value, cursorPosition);
  return normalizeLeadingZeros(
    normalizedDecimal.value,
    normalizedDecimal.cursorPosition,
  );
};

export const applyKeyAtCursor = ({
  currentValue,
  pressedKey,
  cursorPosition,
  decimals,
}: {
  currentValue: string;
  pressedKey: Keys;
  cursorPosition: number;
  decimals: number;
}): { value: string; cursorPosition: number } => {
  const normalizedCurrentValue = currentValue || '0';
  // Defensive bound in case UI selection and amount length momentarily drift.
  const boundedCursorPosition = clamp(
    cursorPosition,
    0,
    normalizedCurrentValue.length,
  );

  if (pressedKey === Keys.Initial) {
    return { value: '0', cursorPosition: 0 };
  }

  if (pressedKey === Keys.Back) {
    if (normalizedCurrentValue === '0' || boundedCursorPosition === 0) {
      return {
        value: normalizedCurrentValue,
        cursorPosition: boundedCursorPosition,
      };
    }

    const nextValue =
      normalizedCurrentValue.slice(0, boundedCursorPosition - 1) +
      normalizedCurrentValue.slice(boundedCursorPosition);

    if (!nextValue) {
      return { value: '0', cursorPosition: 0 };
    }

    return normalizeValue(nextValue, boundedCursorPosition - 1);
  }

  if (pressedKey === Keys.Period) {
    if (decimals === 0 || normalizedCurrentValue.includes('.')) {
      return {
        value: normalizedCurrentValue,
        cursorPosition: boundedCursorPosition,
      };
    }

    const insertedValue =
      normalizedCurrentValue.slice(0, boundedCursorPosition) +
      '.' +
      normalizedCurrentValue.slice(boundedCursorPosition);

    return normalizeValue(insertedValue, boundedCursorPosition + 1);
  }

  if (!regex.hasOneDigit.test(pressedKey)) {
    return {
      value: normalizedCurrentValue,
      cursorPosition: boundedCursorPosition,
    };
  }

  // Preserve existing keypad behavior for replacing the initial zero.
  if (normalizedCurrentValue === '0') {
    return { value: String(pressedKey), cursorPosition: 1 };
  }

  const insertedValue =
    normalizedCurrentValue.slice(0, boundedCursorPosition) +
    pressedKey +
    normalizedCurrentValue.slice(boundedCursorPosition);

  if (decimals > 0) {
    const [, decimalPart = ''] = insertedValue.split('.');
    // Reject edits that would exceed the token's supported fractional precision.
    if (decimalPart.length > decimals) {
      return {
        value: normalizedCurrentValue,
        cursorPosition: boundedCursorPosition,
      };
    }
  }

  return normalizeValue(insertedValue, boundedCursorPosition + 1);
};
