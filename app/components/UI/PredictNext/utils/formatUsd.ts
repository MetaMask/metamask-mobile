/** Formats a canonical signed amount as USD, keeping the sign before the
 * dollar: '20.86' → '$20.86', '-1.20' → '-$1.20'. */
export const formatUsd = (value: string): string =>
  value.startsWith('-') ? `-$${value.slice(1)}` : `$${value}`;
