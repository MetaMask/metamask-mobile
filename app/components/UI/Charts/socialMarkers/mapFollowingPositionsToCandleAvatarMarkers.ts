import type { Trade } from '@metamask/social-controllers';
import { tradeTimestampToMs } from '../../SocialFeed/utils/tradeTimestamp';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';
import type {
  FollowingPositionActor,
  FollowingPositionItem,
  FollowingTokenPositionsResponse,
} from './types';

/**
 * The trade behind one {@link AvatarMarker}, kept so a marker tap can render the
 * trader + fill details in the bottom sheet without re-fetching. Keyed by
 * marker id in {@link CandleAvatarMarkerLookup}.
 */
export interface CandleAvatarMarkerEntry {
  actor: FollowingPositionActor;
  trade: Trade;
  position: FollowingPositionItem;
}

/** Marker id → its originating trade/actor (see {@link CandleAvatarMarkerEntry}). */
export type CandleAvatarMarkerLookup = Record<string, CandleAvatarMarkerEntry>;

/** Markers plus the id→trade lookup the bottom sheet renders from. */
export interface CandleAvatarMarkersResult {
  markers: AvatarMarker[];
  byId: CandleAvatarMarkerLookup;
}

/**
 * Flattens the followed-by-me positions response into {@link AvatarMarker}s for
 * the candlestick (TradingView) chart.
 *
 * Unlike {@link mapFollowingPositionsToAvatarMarkers} (line chart, which anchors
 * to an index in the price series), candle markers carry the raw trade
 * timestamp in **milliseconds** — the WebView snaps each to the nearest bar and
 * derives the Y from that bar's close. No price series is needed here, so
 * out-of-window filtering happens in the WebView (off-screen markers are
 * hidden) rather than being dropped up front.
 *
 * The avatar comes from `actor.imageUrl` (per-trader). Every trade is kept —
 * there is no global cap: the WebView groups markers per candle and draws at
 * most 3 faces per group (plus a total count), so density is handled at render
 * time and the count/bottom sheet always reflect every trade.
 */
export function mapFollowingPositionsToCandleAvatarMarkers(
  response: FollowingTokenPositionsResponse | undefined | null,
): AvatarMarker[] {
  return mapFollowingPositionsToCandleAvatarMarkersWithLookup(response).markers;
}

/**
 * Same mapping as {@link mapFollowingPositionsToCandleAvatarMarkers}, but also
 * returns a `byId` lookup from marker id to its originating trade/actor so a
 * marker (or cluster) tap can render those fills in a bottom sheet. The lookup
 * holds every marker.
 */
export function mapFollowingPositionsToCandleAvatarMarkersWithLookup(
  response: FollowingTokenPositionsResponse | undefined | null,
): CandleAvatarMarkersResult {
  if (!response?.items?.length) return { markers: [], byId: {} };

  const markers: AvatarMarker[] = [];
  const byId: CandleAvatarMarkerLookup = {};

  for (const position of response.items) {
    const { actor } = position;
    if (!actor || !position.trades?.length) continue;

    position.trades.forEach((trade, tradeIndex) => {
      const time = tradeTimestampToMs(trade.timestamp);
      if (!Number.isFinite(time)) return;
      const id = `${actor.profileId}-${trade.transactionHash}-${tradeIndex}`;
      markers.push({
        id,
        time,
        intent: trade.intent,
        avatarUrl: actor.imageUrl ?? undefined,
        traderName: actor.name,
      });
      byId[id] = { actor, trade, position };
    });
  }

  // Chronological order (the WebView groups per candle; order is cosmetic).
  markers.sort((a, b) => a.time - b.time);
  return { markers, byId };
}
