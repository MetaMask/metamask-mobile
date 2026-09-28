import StorageWrapper from '../../../../store/storage-wrapper';
import { SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX } from '../../../../constants/storage';
import Logger from '../../../../util/Logger';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../Homepage/Sections/TopTraders/types';

/**
 * How long a persisted leaderboard stays usable. Past this the snapshot is
 * discarded and the list falls back to its loading state, because a ranking
 * this old is more likely to mislead than to orient — every row could have
 * moved, which reads as noise rather than "here is what changed".
 */
export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Rows kept per snapshot. The list loads 50, and the reveal only needs enough
 * to fill the viewport plus scroll headroom; storing all 50 costs ~25KB per
 * ranking, and there is one snapshot per type/sort/timeframe combination.
 */
export const SNAPSHOT_MAX_ROWS = 25;

/**
 * Fields that are *derived* rather than fetched, so they are deliberately not
 * persisted:
 *
 * `isFollowing` comes from the follow controller's live state, so a persisted
 * value would render yesterday's follow state on a row the user has since
 * changed.
 *
 * `rank` is reassigned client-side by `rankTradersByMetric`, so it is
 * recomputed from the snapshot's array order on read.
 */
type PersistedTrader = Omit<TopTrader, 'isFollowing' | 'rank'>;

interface SnapshotEnvelope {
  /** Epoch ms the snapshot was written, for `SNAPSHOT_MAX_AGE_MS`. */
  timestamp: number;
  traders: PersistedTrader[];
}

/**
 * Identifies which ranking a snapshot belongs to. A snapshot is only ever
 * rendered for the exact combination it was captured from — painting the
 * PnL-sorted 7-day board while the user asked for win-rate over 30 days would
 * animate a change that never happened.
 */
export interface SnapshotKeyParts {
  type: string;
  sort: string;
  timeframe: string;
}

export const buildSnapshotKey = ({
  type,
  sort,
  timeframe,
}: SnapshotKeyParts): string =>
  `${SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX}${type}:${sort}:${timeframe}`;

const isPersistedTrader = (value: unknown): value is PersistedTrader => {
  if (typeof value !== 'object' || value === null) return false;
  const trader = value as Partial<PersistedTrader>;
  return (
    typeof trader.id === 'string' &&
    typeof trader.username === 'string' &&
    typeof trader.address === 'string' &&
    typeof trader.pnlValue === 'number' &&
    typeof trader.percentageChange === 'number' &&
    typeof trader.followerCount === 'number' &&
    typeof trader.overallRank === 'number'
  );
};

/**
 * Reads the last leaderboard the user saw for this ranking.
 *
 * Synchronous on purpose: it seeds the list's very first render, so an async
 * read would paint a loading state for a frame and then replace it, which is
 * the flicker this whole mechanism exists to avoid.
 *
 * Returns `null` — meaning "fall back to loading" — when there is no snapshot,
 * when it is older than `SNAPSHOT_MAX_AGE_MS`, or when it fails to parse.
 *
 * @param keyParts - The ranking the snapshot must belong to.
 * @returns The persisted rows with `rank` and `isFollowing` rehydrated, or `null`.
 */
export const readSnapshot = (
  keyParts: SnapshotKeyParts,
): TopTrader[] | null => {
  try {
    const raw = StorageWrapper.getItemSync(buildSnapshotKey(keyParts));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const envelope = parsed as Partial<SnapshotEnvelope>;
    if (typeof envelope.timestamp !== 'number') return null;
    if (Date.now() - envelope.timestamp >= SNAPSHOT_MAX_AGE_MS) return null;
    if (!Array.isArray(envelope.traders) || envelope.traders.length === 0) {
      return null;
    }
    if (!envelope.traders.every(isPersistedTrader)) return null;

    return envelope.traders.map((trader, index) => ({
      ...trader,
      // Array order is the ranking; `rank` is derived, never trusted from disk.
      rank: index + 1,
      // Re-derived from live controller state by the consumer's mapping.
      isFollowing: false,
    }));
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to read social leaderboard snapshot; falling back to loading state',
    );
    return null;
  }
};

/**
 * Persists the leaderboard the user is currently looking at, so the next visit
 * can open on it and animate to whatever has changed since.
 *
 * Fire-and-forget: a failed write costs the *next* visit its reveal animation,
 * which is not worth surfacing to the user or blocking render on.
 *
 * @param keyParts - The ranking these rows belong to.
 * @param traders - The rows on screen, in their displayed order.
 */
export const writeSnapshot = (
  keyParts: SnapshotKeyParts,
  traders: TopTrader[],
): void => {
  if (traders.length === 0) return;

  const envelope: SnapshotEnvelope = {
    timestamp: Date.now(),
    traders: traders.slice(0, SNAPSHOT_MAX_ROWS).map((trader) => ({
      id: trader.id,
      address: trader.address,
      overallRank: trader.overallRank,
      username: trader.username,
      avatarUri: trader.avatarUri,
      percentageChange: trader.percentageChange,
      pnlValue: trader.pnlValue,
      winRatePercent: trader.winRatePercent,
      pnlPerChain: trader.pnlPerChain,
      followerCount: trader.followerCount,
    })),
  };

  StorageWrapper.setItem(
    buildSnapshotKey(keyParts),
    JSON.stringify(envelope),
  ).catch((error) => {
    Logger.error(
      error as Error,
      'Failed to write social leaderboard snapshot; next visit will not animate',
    );
  });
};

/**
 * Whether the rows the user last saw have moved, which is the only case worth
 * animating.
 *
 * Compares identity and position only. A row whose PnL moved but whose rank
 * held has nothing to slide to, and re-running the animation for it would make
 * the list twitch on every refetch.
 *
 * Only the remembered rows are compared, never the lengths. A snapshot is
 * capped at `SNAPSHOT_MAX_ROWS` while the list fetches a full page, so the two
 * lengths differ on essentially every visit — treating that as a change would
 * make the "nothing moved" path unreachable and force the reveal dwell on every
 * single open. Comparing the prefix also keeps the cap independent of whatever
 * page size the list happens to request.
 *
 * @param before - The order the user last saw, possibly shorter than `after`.
 * @param after - The freshly fetched order.
 * @returns `true` when a remembered trader sits somewhere new, or has gone.
 */
export const hasOrderChanged = (
  before: TopTrader[],
  after: TopTrader[],
): boolean => {
  // Fewer rows than we remember means some of them dropped off the page.
  if (after.length < before.length) return true;
  return before.some((trader, index) => trader.id !== after[index].id);
};
