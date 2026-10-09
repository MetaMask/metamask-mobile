export interface SplitNumericString {
  prefix: string;
  numeric: string;
  suffix: string;
}

/**
 * Matches the first run of digits plus internal group/decimal separators,
 * including a trailing decimal separator so a half-typed "12." stays in the
 * numeric run. Grouping separators must be followed by three digits so ticker
 * suffixes such as "1INCH" are not consumed.
 */
const NUMERIC_RUN_PATTERN =
  /\d+(?:(?:[.,]\d*)|(?:[ ,\u00a0\u202f\u2007\u2009'’]\d{3}))*/u;

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
