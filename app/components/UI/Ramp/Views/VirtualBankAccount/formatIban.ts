/**
 * Groups an IBAN in fours for display, e.g. `DE89 3704 0044 0532 0130 00`.
 * Copy actions use the ungrouped value.
 *
 * @param iban - Raw IBAN, with or without spaces.
 * @returns The IBAN grouped in blocks of four.
 */
export function formatIbanForDisplay(iban: string): string {
  return iban
    .replace(/\s+/gu, '')
    .replace(/(.{4})/gu, '$1 ')
    .trim();
}
