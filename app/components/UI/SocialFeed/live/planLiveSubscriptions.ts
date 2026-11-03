import type { CaipAssetType } from '@metamask/utils';
import type { SocialLivePriceKey } from './types';

export const SPOT_CHANNEL_CAP = 20;

const SPOT_PREFIX = 'spot:';
const PERP_PREFIX = 'perp:';

export interface LiveSubscriptionPlan {
  /** Spot assets to stream, in on-screen order, capped. */
  spotAssetIds: CaipAssetType[];
  /** Hyperliquid symbols to stream, in on-screen order. */
  perpSymbols: string[];
}

/**
 * Splits the visible keys into what each stream should carry. Keys arrive in
 * on-screen order, so the cap drops the assets furthest down the list.
 */
export function planLiveSubscriptions(
  visibleKeys: readonly SocialLivePriceKey[],
  spotCap: number = SPOT_CHANNEL_CAP,
): LiveSubscriptionPlan {
  const spot = new Set<CaipAssetType>();
  const perps = new Set<string>();

  for (const key of visibleKeys) {
    if (key.startsWith(SPOT_PREFIX)) {
      if (spot.size < spotCap) {
        spot.add(key.slice(SPOT_PREFIX.length) as CaipAssetType);
      }
    } else if (key.startsWith(PERP_PREFIX)) {
      perps.add(key.slice(PERP_PREFIX.length));
    }
  }

  return { spotAssetIds: [...spot], perpSymbols: [...perps] };
}

export interface MeasuredCard {
  key: SocialLivePriceKey;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Keys of the cards inside the window, plus `bufferPx` above and below, in
 * top-to-bottom order. Cards on other pager pages sit outside the window
 * horizontally and are skipped.
 */
export function selectVisibleKeys(
  cards: readonly MeasuredCard[],
  viewport: { width: number; height: number },
  bufferPx: number,
): SocialLivePriceKey[] {
  const keys: SocialLivePriceKey[] = [];
  const seen = new Set<SocialLivePriceKey>();

  [...cards]
    .filter(
      (card) =>
        card.width > 0 &&
        card.height > 0 &&
        card.x + card.width > 0 &&
        card.x < viewport.width &&
        card.y + card.height > -bufferPx &&
        card.y < viewport.height + bufferPx,
    )
    .sort((a, b) => a.y - b.y)
    .forEach((card) => {
      if (!seen.has(card.key)) {
        seen.add(card.key);
        keys.push(card.key);
      }
    });

  return keys;
}
