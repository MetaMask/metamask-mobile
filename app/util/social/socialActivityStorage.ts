import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { SOCIAL_LAST_TRADE_AT } from '../../constants/storage';
import StorageWrapper from '../../store/storage-wrapper';

export const SOCIAL_RECENT_ACTIVITY_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Returns whether an epoch-ms or ISO timestamp is inside the social window. */
export const isRecentSocialActivityTimestamp = (
  timestamp: number | string | null | undefined,
  now: number = Date.now(),
): boolean => {
  const timestampMs =
    typeof timestamp === 'number' ? timestamp : Date.parse(timestamp ?? '');

  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return false;
  }

  const elapsed = now - timestampMs;
  return elapsed >= 0 && elapsed < SOCIAL_RECENT_ACTIVITY_WINDOW_MS;
};

/** Builds the storage key for one wallet's last social trade. */
export const getSocialLastTradeStorageKey = (walletAddress: string): string =>
  `${SOCIAL_LAST_TRADE_AT}:${walletAddress}`;

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
export const recordSocialTrade = (
  walletAddress: string,
  timestamp: number = Date.now(),
): void => {
  if (!walletAddress) {
    return;
  }

  try {
    StorageWrapper.setItem(
      getSocialLastTradeStorageKey(walletAddress),
      String(timestamp),
    )?.catch(() => undefined);
  } catch {
    // A missed timestamp only costs this user the reordered section.
  }
};

/** Synchronous by design so homepage section order is decided during render. */
export const hasRecentSocialTrade = (
  walletAddress: string | undefined,
  now: number = Date.now(),
): boolean => {
  if (!walletAddress) {
    return false;
  }

  const stored = StorageWrapper.getItemSync(
    getSocialLastTradeStorageKey(walletAddress),
  );
  if (!stored) {
    return false;
  }

  return isRecentSocialActivityTimestamp(Number(stored), now);
};
