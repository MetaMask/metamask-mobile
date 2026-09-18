export interface SplitNumericString {
  prefix: string;
  numeric: string;
  suffix: string;
}

/**
 * Matches the first run of digits plus any internal group/decimal separators,
 * including a trailing separator so a half-typed "12." stays in the numeric run.
 */
const NUMERIC_RUN_PATTERN = /\d+(?:[.,]\d*)*/u;

/**
 * Splits a display string into the part worth animating and the static text
 * around it, e.g. "$ 250.00 available" -> "$ ", "250.00", " available".
 *
 * Only the first numeric run is animated so tickers containing digits (1INCH,
 * W3) stay in the suffix instead of being torn apart.
 */
export const splitNumericString = (value: string): SplitNumericString => {
  const match = NUMERIC_RUN_PATTERN.exec(value);

  if (!match) {
    return { prefix: value, numeric: '', suffix: '' };
  }

  const start = match.index;
  const end = start + match[0].length;

  return {
    prefix: value.slice(0, start),
    numeric: match[0],
    suffix: value.slice(end),
  };
};
