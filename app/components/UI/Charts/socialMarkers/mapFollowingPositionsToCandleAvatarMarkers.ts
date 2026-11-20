import type { Trade } from '@metamask/social-controllers';
import { tradeTimestampToMs } from '../../SocialFeed/utils/tradeTimestamp';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';
import type {
  FollowingPositionActor,
  FollowingPositionItem,
  FollowingTokenPositionsResponse,
} from './types';
import {
  DEFAULT_MAX_AVATAR_MARKERS,
  type MapFollowingPositionsOptions,
} from './mapFollowingPositionsToAvatarMarkers';

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
 * The avatar comes from `actor.imageUrl` (per-trader); when more than
 * `maxMarkers` survive, the most recent win.
 */
export function mapFollowingPositionsToCandleAvatarMarkers(
  response: FollowingTokenPositionsResponse | undefined | null,
  options?: MapFollowingPositionsOptions,
): AvatarMarker[] {
  return mapFollowingPositionsToCandleAvatarMarkersWithLookup(response, options)
    .markers;
}

/**
 * Same mapping as {@link mapFollowingPositionsToCandleAvatarMarkers}, but also
 * returns a `byId` lookup from marker id to its originating trade/actor so a
 * marker (or cluster) tap can render those fills in a bottom sheet. The lookup
 * only holds the markers that survive the `maxMarkers` cap.
 */
export function mapFollowingPositionsToCandleAvatarMarkersWithLookup(
  response: FollowingTokenPositionsResponse | undefined | null,
  options?: MapFollowingPositionsOptions,
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

  const maxMarkers = options?.maxMarkers ?? DEFAULT_MAX_AVATAR_MARKERS;
  const kept =
    markers.length <= maxMarkers
      ? markers
      : // Keep the most recent markers, then restore chronological order.
        markers
          .slice()
          .sort((a, b) => b.time - a.time)
          .slice(0, maxMarkers)
          .sort((a, b) => a.time - b.time);

  if (kept === markers) return { markers, byId };

  // Trim the lookup to the kept markers so it never references dropped trades.
  const keptById: CandleAvatarMarkerLookup = {};
  for (const marker of kept) keptById[marker.id] = byId[marker.id];
  return { markers: kept, byId: keptById };
}
