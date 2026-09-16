import type { PredictGameLive } from '../../contracts/v1/liveData';
import type {
  PredictGame,
  PredictGameStatus,
  PredictTimestamp,
} from '../../types';

const STATUS_MAP: Record<string, PredictGameStatus> = {
  created: 'scheduled',
  scheduled: 'scheduled',
  live: 'in_progress',
  in_progress: 'in_progress',
  inprogress: 'in_progress',
  delayed: 'delayed',
  suspended: 'suspended',
  postponed: 'postponed',
  complete: 'completed',
  completed: 'completed',
  final: 'completed',
  closed: 'completed',
  canceled: 'canceled',
  cancelled: 'canceled',
};

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const readScore = (value: unknown): string | undefined =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;

const readTimestamp = (value: unknown): PredictTimestamp | undefined => {
  const date =
    typeof value === 'number'
      ? new Date(value * 1000)
      : typeof value === 'string'
        ? new Date(value)
        : undefined;
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString() as PredictTimestamp;
};

const readLiveObservedAtMs = (
  details: PredictGameLive['details'],
): number | undefined => {
  const observedAt = readTimestamp(details.last_updated_ts);
  return observedAt ? Date.parse(observedAt) : undefined;
};

/** True when `incoming` must not replace `previous`. */
export const isOlderKalshiLiveFrame = (
  incoming: Pick<PredictGameLive, 'details'>,
  previous: Pick<PredictGameLive, 'details'>,
): boolean => {
  const incomingMs = readLiveObservedAtMs(incoming.details);
  const previousMs = readLiveObservedAtMs(previous.details);
  if (previousMs === undefined) {
    return false;
  }
  if (incomingMs === undefined) {
    return true;
  }
  return incomingMs < previousMs;
};

// Live frames carry venue-native Kalshi `details` (`football_game`,
// `home_points`, `last_updated_ts`). REST already returns a normalized
// PredictGame; until the stream is normalized server-side too, each new
// sport or venue needs a mobile mapper.
export const mapKalshiGameLiveUpdate = (
  current: PredictGame,
  live: Pick<PredictGameLive, 'type' | 'details'>,
): PredictGame | undefined => {
  if (live.type !== 'football_game') {
    return undefined;
  }

  const liveObservedAt = readTimestamp(live.details.last_updated_ts);
  if (
    liveObservedAt &&
    Date.parse(liveObservedAt) < Date.parse(current.observedAt)
  ) {
    return undefined;
  }

  const statusValue = readString(live.details.status);
  const status = statusValue
    ? STATUS_MAP[statusValue.toLowerCase()]
    : undefined;
  const away = readScore(live.details.away_points);
  const home = readScore(live.details.home_points);
  const quarter = readScore(live.details.quarter);
  const clock = readString(live.details.clock)?.trim() || undefined;

  return {
    ...current,
    status: status ?? current.status,
    score:
      away !== undefined && home !== undefined ? { away, home } : current.score,
    period: quarter === undefined ? current.period : `Q${quarter}`,
    clock: clock ?? current.clock,
    observedAt: liveObservedAt ?? current.observedAt,
  };
};
