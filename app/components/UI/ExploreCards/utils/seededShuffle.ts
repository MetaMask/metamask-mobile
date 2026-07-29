/**
 * mulberry32 — tiny deterministic PRNG. Same seed → same sequence, so the
 * whole userbase sees a stable deck order for the current hour.
 */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher–Yates shuffle driven by a seeded PRNG. Returns a new array. */
export const seededShuffle = <T>(items: readonly T[], seed: number): T[] => {
  const random = mulberry32(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Single repair pass over a shuffled array: when two adjacent items share a
 * key, swap the second with the next item of a different key. Guarantees
 * variety without true backtracking (mirrors the POC spec, section 6).
 */
export const repairAdjacentDuplicates = <T>(
  items: readonly T[],
  getKey: (item: T) => string,
): T[] => {
  const result = [...items];
  for (let i = 1; i < result.length; i++) {
    if (getKey(result[i]) !== getKey(result[i - 1])) {
      continue;
    }
    for (let j = i + 1; j < result.length; j++) {
      if (getKey(result[j]) !== getKey(result[i - 1])) {
        [result[i], result[j]] = [result[j], result[i]];
        break;
      }
    }
  }
  return result;
};
