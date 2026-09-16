import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';
import {
  hasOrderChanged,
  readSnapshot,
  writeSnapshot,
  type SnapshotKeyParts,
} from '../leaderboardSnapshot';

/**
 * How long the previous ranking stays on screen before the fresh one replaces
 * it.
 *
 * Without this the reveal is invisible whenever the fetch resolves before the
 * first paint — a warm in-process cache can answer in the same tick, so React
 * commits both orderings together and the user only ever sees the final one.
 * Holding the old order for a beat guarantees there is something to animate
 * *from*.
 */
export const REVEAL_DWELL_MS = 400;

interface UseLeaderboardRevealOptions<T extends TopTrader> {
  /** Rows as currently returned by the query, already ranked for display. */
  freshTraders: T[];
  /** Whether the query has produced data at least once this mount. */
  hasFetched: boolean;
  /** Which ranking these rows belong to. Snapshots never cross rankings. */
  keyParts: SnapshotKeyParts;
  /**
   * Opts the surface in. Off for the legacy leaderboard, which has no reorder
   * animation and should keep painting whatever the query returns.
   */
  enabled: boolean;
  /**
   * Rebuilds a persisted row into the shape the list renders, so derived
   * fields (`displayMetric`, and `isFollowing` from live controller state) are
   * recomputed rather than restored from disk.
   */
  hydrateRow: (trader: TopTrader) => T;
}

interface UseLeaderboardRevealResult<T extends TopTrader> {
  /** The rows to render — the snapshot until the reveal fires, then fresh. */
  rows: T[];
  /**
   * Whether a snapshot is standing in for data the query has not returned yet.
   * Callers use this to suppress the loading skeleton.
   */
  isShowingSnapshot: boolean;
}

/**
 * Opens the leaderboard on the ranking the user last saw, then animates to the
 * current one.
 *
 * Real rankings move a handful of times a day, so a user is almost never
 * watching when a position actually changes. This turns the reorder animation
 * into a summary of what moved *since their last visit*: paint the remembered
 * order, let it settle, then swap in the fresh order so the rows travel to
 * their new positions.
 *
 * The reveal is deliberately once-per-mount. Later refetches — a pull to
 * refresh, or a sort/timeframe change — apply immediately, because deferring a
 * change the user just asked for reads as lag rather than polish.
 *
 * @param options - See {@link UseLeaderboardRevealOptions}.
 * @returns The rows to render, and whether they came from the snapshot.
 */
export const useLeaderboardReveal = <T extends TopTrader>({
  freshTraders,
  hasFetched,
  keyParts,
  enabled,
  hydrateRow,
}: UseLeaderboardRevealOptions<T>): UseLeaderboardRevealResult<T> => {
  const prefersReducedMotion = useReducedMotion();
  const snapshotKey = `${keyParts.type}:${keyParts.sort}:${keyParts.timeframe}`;

  // Read synchronously during the first render so the very first commit already
  // has rows; an effect-based read would paint a skeleton for a frame first.
  const [snapshot] = useState<TopTrader[] | null>(() =>
    enabled && !prefersReducedMotion ? readSnapshot(keyParts) : null,
  );

  const [hasRevealed, setHasRevealed] = useState(false);

  /**
   * The reveal belongs to the ranking the screen opened on.
   *
   * Switching sort or timeframe is the user asking for a different ranking
   * *now*, so from that point on the query result goes straight to the screen.
   * Re-arming the reveal would flash the new ranking, snap back to a stored
   * one, then dwell before showing what they just asked for — and timeframe is
   * remapped in place with no refetch, so the correct order is already there.
   *
   * Derived rather than reset in an effect, so the first render after a switch
   * already passes through and there is no intermediate commit to flash.
   */
  const openingKeyRef = useRef(snapshotKey);
  const isOpeningRanking = openingKeyRef.current === snapshotKey;

  const isShowingSnapshot =
    Boolean(snapshot) && !hasRevealed && isOpeningRanking;

  // Hold the fresh order until the remembered one has had its moment. Reduced
  // motion skips the wait entirely — there is no animation to make room for.
  useEffect(() => {
    if (!isShowingSnapshot || !hasFetched) return;

    if (prefersReducedMotion || freshTraders.length === 0) {
      setHasRevealed(true);
      return;
    }

    // Nothing moved, so there is nothing to reveal; swap silently.
    if (snapshot && !hasOrderChanged(snapshot, freshTraders)) {
      setHasRevealed(true);
      return;
    }

    const timeoutId = setTimeout(() => setHasRevealed(true), REVEAL_DWELL_MS);
    return () => clearTimeout(timeoutId);
  }, [
    isShowingSnapshot,
    hasFetched,
    prefersReducedMotion,
    freshTraders,
    snapshot,
  ]);

  // Persist whatever the user is actually looking at, so the next visit has
  // somewhere to animate from. Skipped while the snapshot is on screen, or we
  // would immediately overwrite it with itself.
  const persist = useCallback(() => {
    if (!enabled || isShowingSnapshot || freshTraders.length === 0) return;
    writeSnapshot(keyParts, freshTraders);
  }, [enabled, isShowingSnapshot, freshTraders, keyParts]);

  useEffect(persist, [persist]);

  const rows = useMemo(() => {
    if (!isShowingSnapshot || !snapshot) return freshTraders;
    return snapshot.map(hydrateRow);
  }, [isShowingSnapshot, snapshot, freshTraders, hydrateRow]);

  return { rows, isShowingSnapshot };
};
