import { tradeTimestampToMs } from '../../../UI/SocialFeed/utils/tradeTimestamp';
import {
  formatSocialElapsed,
  formatSocialUnit,
} from '../../../UI/SocialFeed/utils/formatSocialTime';

/**
 * Compact hold-time label for the composer preview. Same units as the feed
 * card. A missing span reads `1m` rather than an em dash, because the composer
 * still has a position to show.
 *
 * @param durationMs - Span in milliseconds.
 * @returns Compact hold label.
 */
export const formatHoldDuration = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return formatSocialUnit('minutes', 1);
  }
  return formatSocialElapsed(durationMs);
};

export const holdDurationFromTimestamps = (
  startTimestamp: number,
  endTimestamp: number,
): string => {
  const startMs = tradeTimestampToMs(startTimestamp);
  const endMs = tradeTimestampToMs(endTimestamp);
  return formatHoldDuration(endMs - startMs);
};
