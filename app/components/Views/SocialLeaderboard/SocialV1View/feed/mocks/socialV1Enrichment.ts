import type { SocialV1PerpDirection } from '../types';

/**
 * Deterministic stand-ins for the enrichment the social API does not expose
 * yet: an open position's mark and its take-profit / stop-loss bracket.
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

/** Take-profit distance from entry, as a fraction, in the winning direction. */
const TAKE_PROFIT_FRACTIONS = [0.06, 0.09, 0.12, 0.18, 0.25] as const;

/** Stop-loss distance from entry, as a fraction, in the losing direction. */
const STOP_LOSS_FRACTIONS = [0.03, 0.045, 0.06, 0.08] as const;

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

export interface MockAutoClose {
  takeProfit: number;
  stopLoss: number;
}

/**
 * A take-profit / stop-loss pair bracketing the real entry on the correct
 * sides for the direction: a short takes profit below entry and stops out
 * above it. Returns `null` without a real entry to bracket.
 */
export const mockAutoClose = (
  traderId: string,
  symbol: string,
  entryPrice: number | null,
  direction: SocialV1PerpDirection,
): MockAutoClose | null => {
  if (entryPrice == null || entryPrice <= 0) {
    return null;
  }

  const takeProfitDistance = pick(TAKE_PROFIT_FRACTIONS, traderId, symbol);
  const stopLossDistance = pick(STOP_LOSS_FRACTIONS, symbol, traderId);
  const winningSign = direction === 'long' ? 1 : -1;

  return {
    takeProfit: entryPrice * (1 + winningSign * takeProfitDistance),
    stopLoss: entryPrice * (1 - winningSign * stopLossDistance),
  };
};
