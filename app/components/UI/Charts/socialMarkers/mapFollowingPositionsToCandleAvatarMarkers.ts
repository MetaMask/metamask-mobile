import { tradeTimestampToMs } from '../../SocialFeed/utils/tradeTimestamp';
import type { AvatarMarker } from '../AdvancedChart/AdvancedChart.types';
import type { FollowingTokenPositionsResponse } from './types';
import {
  DEFAULT_MAX_AVATAR_MARKERS,
  type MapFollowingPositionsOptions,
} from './mapFollowingPositionsToAvatarMarkers';

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
  if (!response?.items?.length) return [];

  const markers: AvatarMarker[] = [];

  for (const item of response.items) {
    const { actor } = item;
    if (!actor || !item.trades?.length) continue;

    item.trades.forEach((trade, tradeIndex) => {
      const time = tradeTimestampToMs(trade.timestamp);
      if (!Number.isFinite(time)) return;
      markers.push({
        id: `${actor.profileId}-${trade.transactionHash}-${tradeIndex}`,
        time,
        intent: trade.intent,
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
    .sort((a, b) => b.time - a.time)
    .slice(0, maxMarkers)
    .sort((a, b) => a.time - b.time);
}
