/**
 * Deterministic stand-in for the enrichment the social API does not expose
 * yet: an open perp position's mark price.
 *
 * Every value is keyed by trader id and market symbol through a hash, so the
 * same person and market always get the same fake numbers. Without that, a
 * re-render or a page append would reshuffle the values in front of the user
 * and the whole feed would read as noise.
 *
 * Prices are expressed as offsets from a *real* derived entry price rather than
 * a frozen symbol table. A hardcoded `BTC: $104,213` is wrong the moment the
 * market moves; a percentage off the trader's actual entry stays plausible
 * indefinitely and degrades to "no value" when the entry cannot be derived.
 */

/** FNV-1a. Small, dependency-free, and stable across runs and platforms. */
const hashKey = (...parts: string[]): number => {
  let hash = 0x811c9dc5;
  for (const part of parts) {
    for (let index = 0; index < part.length; index++) {
      hash ^= part.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash >>> 0;
};

const pick = <T>(table: readonly T[], ...key: string[]): T =>
  table[hashKey(...key) % table.length];

/** Fraction of the entry price an open position's mark sits away from it. */
const MARK_OFFSET_FRACTIONS = [
  -0.062, -0.031, -0.014, 0.009, 0.023, 0.048, 0.071,
] as const;

/**
 * An open position's mark price. Returns `null` when there is no real entry to
 * offset from, so the card drops the subtitle rather than inventing a price
 * from nothing.
 */
export const mockMarkPrice = (
  traderId: string,
  symbol: string,
  entryPrice: number | null,
): number | null => {
  if (entryPrice == null || entryPrice <= 0) {
    return null;
  }
  return entryPrice * (1 + pick(MARK_OFFSET_FRACTIONS, traderId, symbol));
};
