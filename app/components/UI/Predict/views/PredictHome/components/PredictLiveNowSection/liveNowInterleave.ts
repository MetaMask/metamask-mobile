import type { PredictMarket } from '../../../../types';

/** Max number of crypto Up/Down cards shown in the Live Now rail. */
export const LIVE_NOW_MAX_CRYPTO = 3;

/** Live cards shown between each crypto card (Figma: 2 live, 1 crypto, ...). */
const LIVE_PER_CRYPTO = 2;

/**
 * Interleaves live (sports) markets with crypto Up/Down markets for the
 * Live Now carousel.
 *
 * Figma order: every 3rd slot is a crypto card, i.e. `2 live, 1 crypto`
 * repeating (`L L C L L C L L C L`). Crypto is capped at {@link LIVE_NOW_MAX_CRYPTO};
 * any extra live markets fill the remaining slots. When there are no live
 * markets, the (capped) crypto markets are shown on their own.
 *
 * Pure + deterministic so it can be unit-tested in isolation; the section
 * hook supplies the already-fetched/curated input arrays.
 */
export const interleaveLiveNowMarkets = (
  liveMarkets: PredictMarket[],
  cryptoMarkets: PredictMarket[],
): PredictMarket[] => {
  const live = [...liveMarkets];
  const crypto = cryptoMarkets.slice(0, LIVE_NOW_MAX_CRYPTO);

  const result: PredictMarket[] = [];
  let sinceCrypto = 0;

  while (live.length > 0 || crypto.length > 0) {
    const shouldPlaceCrypto =
      sinceCrypto >= LIVE_PER_CRYPTO || live.length === 0;

    if (shouldPlaceCrypto && crypto.length > 0) {
      result.push(crypto.shift() as PredictMarket);
      sinceCrypto = 0;
      continue;
    }

    if (live.length > 0) {
      result.push(live.shift() as PredictMarket);
      sinceCrypto += 1;
      continue;
    }

    // No live left and no crypto eligible to place — nothing more to add.
    break;
  }

  return result;
};
