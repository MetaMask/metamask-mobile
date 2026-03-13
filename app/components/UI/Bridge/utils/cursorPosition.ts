import { clamp } from './clamp';

const isDecimalSeparatorMatch = (rawChar: string, formattedChar: string) =>
  rawChar === '.' && /\D/u.test(formattedChar);

/**
 * Maps a cursor index from formatted display value (with locale separators)
 * to the raw amount string index used by state and keypad rules.
 */
export const mapFormattedCursorToRaw = ({
  rawValue,
  formattedValue,
  formattedCursorIndex,
}: {
  rawValue: string;
  formattedValue: string;
  formattedCursorIndex: number;
}): number => {
  const boundedCursor = clamp(formattedCursorIndex, 0, formattedValue.length);
  let rawIndex = 0;

  for (
    let formattedIndex = 0;
    formattedIndex < boundedCursor && rawIndex < rawValue.length;
    formattedIndex++
  ) {
    const rawChar = rawValue[rawIndex];
    const formattedChar = formattedValue[formattedIndex];

    if (
      rawChar === formattedChar ||
      isDecimalSeparatorMatch(rawChar, formattedChar)
    ) {
      rawIndex += 1;
    }
  }

  return rawIndex;
};

/**
 * Maps a cursor index from raw amount string to formatted display value.
 */
export const mapRawCursorToFormatted = ({
  rawValue,
  formattedValue,
  rawCursorIndex,
}: {
  rawValue: string;
  formattedValue: string;
  rawCursorIndex: number;
}): number => {
  const boundedRawCursor = clamp(rawCursorIndex, 0, rawValue.length);
  let rawIndex = 0;
  let formattedIndex = 0;

  while (
    formattedIndex < formattedValue.length &&
    rawIndex < boundedRawCursor
  ) {
    const rawChar = rawValue[rawIndex];
    const formattedChar = formattedValue[formattedIndex];

    if (
      rawChar === formattedChar ||
      isDecimalSeparatorMatch(rawChar, formattedChar)
    ) {
      rawIndex += 1;
    }

    formattedIndex += 1;
  }

  return formattedIndex;
};
