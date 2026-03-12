import { Keys } from '../../../Base/Keypad';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isDigitKey = (input: Keys): input is `${number}` => /^(\d)$/u.test(input);

const normalizeLeadingDecimal = (
  value: string,
  cursorPosition: number,
): { value: string; cursorPosition: number } =>
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
  const boundedCursor = clamp(cursorPosition, 0, normalizedCurrentValue.length);

  if (pressedKey === Keys.Initial) {
    return { value: '0', cursorPosition: 0 };
  }

  if (pressedKey === Keys.Back) {
    if (normalizedCurrentValue === '0' || boundedCursor === 0) {
      return { value: normalizedCurrentValue, cursorPosition: boundedCursor };
    }

    const nextValue =
      normalizedCurrentValue.slice(0, boundedCursor - 1) +
      normalizedCurrentValue.slice(boundedCursor);

    if (!nextValue) {
      return { value: '0', cursorPosition: 0 };
    }

    return normalizeValue(nextValue, boundedCursor - 1);
  }

  if (pressedKey === Keys.Period) {
    if (decimals === 0 || normalizedCurrentValue.includes('.')) {
      return { value: normalizedCurrentValue, cursorPosition: boundedCursor };
    }

    const insertedValue =
      normalizedCurrentValue.slice(0, boundedCursor) +
      '.' +
      normalizedCurrentValue.slice(boundedCursor);

    return normalizeValue(insertedValue, boundedCursor + 1);
  }

  if (!isDigitKey(pressedKey)) {
    return { value: normalizedCurrentValue, cursorPosition: boundedCursor };
  }

  // Preserve existing keypad behavior for replacing the initial zero.
  if (normalizedCurrentValue === '0') {
    return { value: pressedKey, cursorPosition: 1 };
  }

  const insertedValue =
    normalizedCurrentValue.slice(0, boundedCursor) +
    pressedKey +
    normalizedCurrentValue.slice(boundedCursor);

  if (decimals > 0) {
    const [, decimalPart = ''] = insertedValue.split('.');
    if (decimalPart.length > decimals) {
      return { value: normalizedCurrentValue, cursorPosition: boundedCursor };
    }
  }

  return normalizeValue(insertedValue, boundedCursor + 1);
};
