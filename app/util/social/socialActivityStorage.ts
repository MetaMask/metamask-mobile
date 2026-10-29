import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { SOCIAL_LAST_TRADE_AT } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';

export const SOCIAL_RECENT_ACTIVITY_WINDOW_MS = 48 * 60 * 60 * 1000;

export const isRecentSocialActivityTimestamp = (
  timestamp?: string | null,
  now: number = Date.now(),
): boolean => {
  if (!timestamp) {
    return false;
  }

  const parsedTimestamp = Date.parse(timestamp);
  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  const elapsed = now - parsedTimestamp;
  return elapsed >= 0 && elapsed < SOCIAL_RECENT_ACTIVITY_WINDOW_MS;
};

const SOCIAL_TRADE_SOURCES = new Set<string>([
  'notification',
  'profile_position',
  'leaderboard',
  'trader_feed',
  MetaMetricsSwapsEventSource.FollowTradingTokenScreen,
  MetaMetricsSwapsEventSource.FollowTradingFeedScreen,
]);

/**
 * Returns whether a trade was initiated from a social surface.
 *
 * Quick Buy uses snake-case source names, while the Bridge flow uses
 * `MetaMetricsSwapsEventSource` values.
 */
export const isSocialTradeSource = (source?: string): boolean =>
  source !== undefined && SOCIAL_TRADE_SOURCES.has(source);

/**
 * Called after a social trade is accepted by the Bridge controller.
 *
 * Storage failures must not affect the user's trade, so both synchronous and
 * asynchronous storage errors are intentionally ignored.
 */
export const recordSocialTrade = (timestamp: number = Date.now()): void => {
  try {
    StorageWrapper.setItem(SOCIAL_LAST_TRADE_AT, String(timestamp))?.catch(
      () => undefined,
    );
  } catch {
    // A missed timestamp only costs this user the reordered section.
  }
};

/** Synchronous by design so homepage section order is decided during render. */
export const hasRecentSocialTrade = (now: number = Date.now()): boolean => {
  const stored = StorageWrapper.getItemSync(SOCIAL_LAST_TRADE_AT);
  if (!stored) {
    return false;
  }

  const timestamp = Number(stored);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }

  const elapsed = now - timestamp;
  return elapsed >= 0 && elapsed < SOCIAL_RECENT_ACTIVITY_WINDOW_MS;
};
