import type { Middleware } from 'redux';

/**
 * Diagnostic ring buffer of recently dispatched Redux action types.
 *
 * "Maximum update depth exceeded" is reported by React against whichever fiber
 * happens to schedule the update that crosses the limit, not against the code
 * producing the update pressure. In the reported stacks that fiber is a
 * react-redux subscriber, so the action types dispatched immediately before the
 * throw are the part that identifies the actual source.
 *
 * Only action types are retained. Payloads are never stored, so this carries no
 * addresses, balances or other user data.
 */

const MAX_ENTRIES = 60;
const RECENT_WINDOW_MS = 2000;

interface TraceEntry {
  type: string;
  timestamp: number;
}

const entries: TraceEntry[] = [];

function recordActionType(type: string): void {
  entries.push({ type, timestamp: Date.now() });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
}

export interface ReduxActionTrace {
  /** Most recent action types, oldest first. */
  recentActionTypes: string[];
  /** Action types dispatched in the trailing window, with counts, busiest first. */
  actionCountsInWindow: Record<string, number>;
  /** How many actions were dispatched in the trailing window. */
  actionsInWindow: number;
  /** Width of the trailing window, in milliseconds. */
  windowMs: number;
}

/**
 * Snapshot of what Redux has been doing most recently. Attached to the
 * ErrorBoundary report so a crash carries the dispatch activity preceding it.
 */
export function getReduxActionTrace(): ReduxActionTrace {
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  const windowed = entries.filter((entry) => entry.timestamp >= cutoff);

  const counts: Record<string, number> = {};
  for (const entry of windowed) {
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;
  }

  const sortedCounts = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .reduce<Record<string, number>>((acc, [type, count]) => {
      acc[type] = count;
      return acc;
    }, {});

  return {
    recentActionTypes: entries.map((entry) => entry.type),
    actionCountsInWindow: sortedCounts,
    actionsInWindow: windowed.length,
    windowMs: RECENT_WINDOW_MS,
  };
}

/** Test seam: drops everything recorded so far. */
export function resetReduxActionTrace(): void {
  entries.length = 0;
}

/**
 * Records the type of every dispatched action. Deliberately does no work beyond
 * a push and an occasional splice so it stays negligible on the dispatch path.
 */
export const reduxActionTraceMiddleware: Middleware =
  () => (next) => (action) => {
    const type = (action as { type?: unknown })?.type;
    if (typeof type === 'string') {
      recordActionType(type);
    }
    return next(action);
  };
