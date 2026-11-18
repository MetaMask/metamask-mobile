import { useCallback, useEffect, useReducer, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@metamask/react-data-query';
import { hashKey } from '@tanstack/react-query';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { packPartnerQueries } from '../../../services/data/packPartnerQueries';
import { PACK_PARTNER_ENVIRONMENT, RECENT_OPENINGS_LIMIT } from '../constants';
import type {
  PackPartnerOpening,
  PackPartnerOpeningFilters,
} from '../types/openings';
import { mergeOpenings } from '../utils/openings';

export interface PackPartnerOpeningsOptions {
  /** Only enable while the screen/section is visible. */
  enabled?: boolean;
  /** Maximum displayed AND queued openings. Default: 20. */
  listLimit?: number;
  /** Delay between snapshot reads in milliseconds. Default: 1000. */
  pollIntervalMs?: number;
  /** Minimum delay between insertions in milliseconds. Default: 1000. */
  insertIntervalMs?: number;
}

export const PACK_PARTNER_OPENINGS_DEFAULTS = {
  listLimit: RECENT_OPENINGS_LIMIT,
  pollIntervalMs: 1_000,
  insertIntervalMs: 1_000,
} as const;

interface FeedState {
  key: string;
  data?: PackPartnerOpening[];
  queue: PackPartnerOpening[];
  /** Bounded latest snapshot IDs plus a watermark prevent replaying old wins. */
  seen: string[];
  newestAt: number;
}

type FeedAction =
  | {
      type: 'snapshot';
      key: string;
      openings: PackPartnerOpening[];
      limit: number;
    }
  | { type: 'insert'; key: string; limit: number };

const initialFeed: FeedState = {
  key: '',
  queue: [],
  seen: [],
  newestAt: -Infinity,
};

const reduceFeed = (state: FeedState, action: FeedAction): FeedState => {
  if (action.type === 'insert') {
    if (state.key !== action.key || !state.queue.length) return state;
    const queue = state.queue.slice();
    const next = queue.pop();
    return {
      ...state,
      queue,
      data: mergeOpenings(state.data ?? [], next ? [next] : [], action.limit),
    };
  }
  const { key, openings, limit } = action;
  const newestAt = Math.max(
    state.key === key ? state.newestAt : -Infinity,
    ...openings.map((opening) => opening.openedAt),
  );
  const seen = openings.map((opening) => opening.id);
  if (state.key !== key || !state.data) {
    return {
      key,
      data: mergeOpenings([], openings, limit),
      queue: [],
      seen,
      newestAt,
    };
  }
  const known = new Set([
    ...state.seen,
    ...state.data.map(({ id }) => id),
    ...state.queue.map(({ id }) => id),
  ]);
  const incoming = openings.filter(
    ({ id, openedAt }) => !known.has(id) && openedAt >= state.newestAt,
  );
  return {
    ...state,
    data: state.data.slice(0, limit),
    queue: mergeOpenings(state.queue, incoming, limit),
    seen,
    newestAt,
  };
};

/**
 * Public openings: REST polling and bounded presentation queue, owned by the
 * visible screen. Visits are short and already need an initial HTTP snapshot;
 * polling avoids a socket/auth lifecycle and an extra realtime dependency.
 * TanStack Query deduplicates reads; the DataService owns server data. This hook
 * owns ONLY presentation: show the first snapshot, then prepend one queued win
 * per insert interval. Both the list and queue retain at most `listLimit` wins.
 * A burst larger than the queue retains only its newest wins (not an indexer).
 *
 * `pause`/`resume` suspend insertions, never polling: wire them to scrolling away
 * from/back to the start. Disabled, background and offline states stop both
 * clocks. Changing filters starts a separate feed; old responses cannot enter it.
 * Every endpoint filter is forwarded; order is always newest first (the API
 * has no sort option). `wallet` and `perTier` precedence belongs to the API.
 * Defaults are 20 items / 1000 ms poll / 1000 ms insert, overridable per view.
 *
 * @param filters - getAllWinners options; omit packType to read every pack.
 * @param options - Visibility, list bound and independent polling/insertion delays.
 * @returns Bounded openings, query state and pause/resume/refresh actions.
 */
export const usePackPartnerOpenings = (
  filters: PackPartnerOpeningFilters = {},
  options: PackPartnerOpeningsOptions = {},
) => {
  const {
    enabled = true,
    listLimit = PACK_PARTNER_OPENINGS_DEFAULTS.listLimit,
    pollIntervalMs = PACK_PARTNER_OPENINGS_DEFAULTS.pollIntervalMs,
    insertIntervalMs = PACK_PARTNER_OPENINGS_DEFAULTS.insertIntervalMs,
  } = options;
  for (const value of [listLimit, pollIntervalMs, insertIntervalMs]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(
        'Openings limits and intervals must be positive integers',
      );
    }
  }
  const networkTier = useNetworkTier();
  const [foreground, setForeground] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const [pausedKey, setPausedKey] = useState<string>();
  const active = enabled && foreground && networkTier !== 'NONE';
  const descriptor = packPartnerQueries.getRecentOpenings(
    PACK_PARTNER_ENVIRONMENT,
    { ...filters, count: filters.count ?? Math.min(listLimit, 200) },
  );
  const key = hashKey(descriptor.queryKey);
  const query = useQuery<PackPartnerOpening[]>({
    queryKey: descriptor.queryKey,
    enabled: active,
    refetchInterval: active ? pollIntervalMs : false,
    refetchIntervalInBackground: false,
  });
  const [feed, dispatch] = useReducer(reduceFeed, initialFeed);
  const isPaused = pausedKey === key;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      setForeground(status === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setPausedKey(undefined);
  }, [key]);

  useEffect(() => {
    if (active && query.data) {
      dispatch({
        type: 'snapshot',
        key,
        openings: query.data,
        limit: listLimit,
      });
    }
  }, [active, key, query.data, listLimit]);

  useEffect(() => {
    if (!active || isPaused) return undefined;
    const timer = setInterval(
      () => dispatch({ type: 'insert', key, limit: listLimit }),
      insertIntervalMs,
    );
    return () => clearInterval(timer);
  }, [active, isPaused, key, listLimit, insertIntervalMs]);

  const pause = useCallback(() => setPausedKey(key), [key]);
  const resume = useCallback(() => setPausedKey(undefined), []);
  const { refetch } = query;
  const refresh = useCallback(() => {
    if (active) refetch().catch(() => undefined);
  }, [active, refetch]);
  const data = feed.key === key ? feed.data : undefined;
  return {
    data,
    isPending: !data && query.isPending,
    isRefetching: Boolean(data) && query.isFetching,
    isError: query.isError && !data?.length,
    isPaused,
    pendingCount: feed.key === key ? feed.queue.length : 0,
    pause,
    resume,
    refresh,
  };
};
