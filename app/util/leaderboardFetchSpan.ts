/**
 * Lets the Top traders perf session wrap one leaderboard fetch without a
 * core → view import. The perf module registers the wrapper when it loads.
 */
type LeaderboardFetchWrapper = <T>(
  rawOptions: unknown,
  run: () => Promise<T>,
) => Promise<T>;

let wrapper: LeaderboardFetchWrapper | null = null;

export function setLeaderboardFetchSpanWrapper(
  next: LeaderboardFetchWrapper | null,
): void {
  wrapper = next;
}

export function maybeTraceLeaderboardFetch<T>(
  rawOptions: unknown,
  run: () => Promise<T>,
): Promise<T> {
  if (!wrapper) {
    return run();
  }
  return wrapper(rawOptions, run);
}
