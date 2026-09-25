import { splitNumericString } from './splitNumericString';

const stripGroupingSeparators = (value: string) => value.replace(/,/gu, '');

/** Empty-field placeholder: "0", "0.0", "0.00", … */
export const isZeroPlaceholder = (numeric: string): boolean =>
  /^0+(?:\.0*)?$/u.test(numeric.replace(/,/gu, ''));

/**
 * True when `next` is the same numeric run as `previous`, or differs by a
 * single digit appended or deleted at the end (the keypad path). Grouping
 * commas are ignored so `123` → `1,234` still counts as typing one digit.
 *
 * Replacing the zero placeholder with a single typed digit — or the reverse,
 * deleting the last digit back to the placeholder — is also incremental.
 * Those are keypad keypresses, not a 25% / Max jump.
 *
 * Percentage / Max replace the whole amount at once and return false.
 */
export const isIncrementalNumericChange = (
  previous: string,
  next: string,
): boolean => {
  const previousNumeric = stripGroupingSeparators(
    splitNumericString(previous).numeric,
  );
  const nextNumeric = stripGroupingSeparators(splitNumericString(next).numeric);

  if (previousNumeric === nextNumeric) {
    return true;
  }

  if (nextNumeric.length === previousNumeric.length + 1) {
    return nextNumeric.startsWith(previousNumeric);
  }

  if (previousNumeric.length === nextNumeric.length + 1) {
    return previousNumeric.startsWith(nextNumeric);
  }

  const previousDigits = previousNumeric.replace(/[.]/gu, '');
  const nextDigits = nextNumeric.replace(/[.]/gu, '');

  if (isZeroPlaceholder(previousNumeric)) {
    return nextDigits.length === 1;
  }

  if (isZeroPlaceholder(nextNumeric)) {
    return previousDigits.length === 1;
  }

  return false;
};
