import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { mapTradesToMarkers } from '../../../Views/SocialLeaderboard/TraderPositionView/utils/tradeMarkers';
import type { FollowingTokenPositionsResponse } from './types';

/** A follower's single trade, positioned on the line chart. */
export interface AvatarTradeMarker {
  /** Stable React key / testID suffix. */
  id: string;
  /** Index into the `prices` array the marker is anchored to. */
  index: number;
  /** `'enter'` = buy (green badge), `'exit'` = sell (red badge). */
  intent: 'enter' | 'exit';
  /** Follower avatar URL. Undefined => render the initials fallback. */
  avatarUrl?: string;
  /** Display name, used for the fallback initial and (future) tap detail. */
  traderName: string;
}

export interface MapFollowingPositionsOptions {
  /**
   * Hard cap on rendered markers (keeps the most recent). Avatars are remote
   * images, so an unbounded set on a busy token would hurt scroll/scrub
   * performance. Defaults to {@link DEFAULT_MAX_AVATAR_MARKERS}.
   */
  maxMarkers?: number;
}

/** Default marker cap — see {@link MapFollowingPositionsOptions.maxMarkers}. */
export const DEFAULT_MAX_AVATAR_MARKERS = 30;

/**
 * Flattens the followed-by-me positions response into per-trade avatar markers
 * anchored to the line chart's price series.
 *
 * - Each item is a followed trader's position, carrying its `actor` (the trader)
 * and `trades`. The avatar comes from `actor.imageUrl` (per-trader, not
 * per-trade), so every marker for one follower reuses that URL; it may be absent.
 * - Trades outside the chart's time window are dropped (via `mapTradesToMarkers`).
 * - When more than `maxMarkers` survive, the most recent (highest index) win.
 */
export function mapFollowingPositionsToAvatarMarkers(
  response: FollowingTokenPositionsResponse | undefined | null,
  prices: readonly TokenPrice[],
  options?: MapFollowingPositionsOptions,
): AvatarTradeMarker[] {
  if (!response?.items?.length || prices.length < 2) return [];

  const markers: AvatarTradeMarker[] = [];

  for (const item of response.items) {
    const { actor } = item;
    if (!actor || !item.trades?.length) continue;

    item.trades.forEach((trade, tradeIndex) => {
      // Reuse the SLB binary-search windowing (drops out-of-window trades).
      const [mapped] = mapTradesToMarkers([trade], prices);
      if (!mapped) return;
      markers.push({
        id: `${actor.profileId}-${mapped.transactionHash}-${tradeIndex}`,
        index: mapped.index,
        intent: mapped.intent,
        avatarUrl: actor.imageUrl ?? undefined,
        traderName: actor.name,
      });
    });
  }

  const maxMarkers = options?.maxMarkers ?? DEFAULT_MAX_AVATAR_MARKERS;
  if (markers.length <= maxMarkers) return markers;

  // Keep the most recent markers, then restore chronological order.
  return markers
    .slice()
    .sort((a, b) => b.index - a.index)
    .slice(0, maxMarkers)
    .sort((a, b) => a.index - b.index);
}
