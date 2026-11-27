import { useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import Logger from '../../../../../util/Logger';
import Engine from '../../../../../core/Engine';
import type {
  PredictIndexError,
  PredictIndexLive,
  PredictIndexPoint,
  PredictIndexSnapshot,
} from '../../contracts/v1/liveData';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../../services/PredictLiveDataService';
import type { PredictEntityId, PredictVenueId } from '../../types';
import {
  appendIndexPoint,
  PREDICT_INDEX_SERIES_MAX_POINTS,
  PREDICT_INDEX_SERIES_MIN_POINT_GAP_MS,
  toOrderedIndexPoints,
} from '../../utils/indexSeries';
import { isOlderLiveFrame } from '../../utils/mergeLiveData';

/** Least time between two state updates. Frames inside it flush together. */
export const LIVE_INDEX_FLUSH_INTERVAL_MS = 250;
/** Consecutive errors, with no good frame between, before the hook stops. */
export const LIVE_INDEX_MAX_ERRORS = 5;
export const LIVE_INDEX_BACKOFF_BASE_MS = 1000;
export const LIVE_INDEX_BACKOFF_MAX_MS = 30_000;
/** Silence after which the series counts as stale. The server sends 1 per s. */
export const LIVE_INDEX_STALE_AFTER_MS = 15_000;

/**
 * - `idle`: not watching (disabled, no Event, or the screen is not focused).
 * - `loading`: watching, no frame yet.
 * - `live`: frames arrive.
 * - `stale`: an error frame or silence. The last data stays. The hook backs off and tries again.
 * - `final`: the last frame of the window arrived. No frame follows it.
 * - `stopped`: too many errors in a row. The hook has released the Event and makes no more requests until the screen refocuses or the inputs change.
 */
export type LiveIndexSeriesStatus =
  | 'idle'
  | 'loading'
  | 'live'
  | 'stale'
  | 'final'
  | 'stopped';

export interface LiveIndexSeries {
  status: LiveIndexSeriesStatus;
  /** Ordered, thinned window series (60-second average). */
  points: readonly PredictIndexPoint[];
  /** The newest tick: the value to show, with the settlement average. */
  latest: PredictIndexLive | undefined;
  /** Errors since the last good frame. */
  errorCount: number;
}

export interface UseLiveIndexSeriesOptions {
  /** Set `false` to hold no watch, for example with a capability gate. */
  enabled?: boolean;
  maxPoints?: number;
  minPointGapMs?: number;
  /** Never below `LIVE_INDEX_FLUSH_INTERVAL_MS`. */
  flushIntervalMs?: number;
  maxErrors?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  staleAfterMs?: number;
}

const EMPTY: readonly PredictIndexPoint[] = [];

const IDLE_SERIES: LiveIndexSeries = {
  status: 'idle',
  points: EMPTY,
  latest: undefined,
  errorCount: 0,
};

const watchIndex = (venueId: PredictVenueId, eventId: PredictEntityId) =>
  Engine.controllerMessenger.call(
    `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchIndex`,
    venueId,
    [eventId],
  );

const unwatchIndex = (venueId: PredictVenueId, eventId: PredictEntityId) =>
  Engine.controllerMessenger.call(
    `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchIndex`,
    venueId,
    [eventId],
  );

/**
 * Holds the live series of one Up/Down window (the `index` topic) for as long
 * as the screen is focused. It follows the limits from the Polymarket Up/Down
 * work (PRED-1135, PRED-1033, PRED-1242):
 *
 * - A tick is appended to a mutable, ordered buffer and the buffer is trimmed to `maxPoints`. The series is never rebuilt per tick.
 * - React state changes at most once per `flushIntervalMs` (250 ms): the first frame after a quiet period flushes at once, later frames wait for the end of the interval.
 * - There is no polling loop. The server pushes frames. One silence timer marks the data stale.
 * - An error frame makes the hook release the Event, wait with exponential backoff and watch again. After `maxErrors` errors in a row it stops.
 * - It releases the Event when the screen loses focus, when `enabled` turns off, when the Event changes, and on unmount.
 */
export const useLiveIndexSeries = (
  venueId: PredictVenueId,
  eventId: PredictEntityId | undefined,
  {
    enabled = true,
    maxPoints = PREDICT_INDEX_SERIES_MAX_POINTS,
    minPointGapMs = PREDICT_INDEX_SERIES_MIN_POINT_GAP_MS,
    flushIntervalMs = LIVE_INDEX_FLUSH_INTERVAL_MS,
    maxErrors = LIVE_INDEX_MAX_ERRORS,
    backoffBaseMs = LIVE_INDEX_BACKOFF_BASE_MS,
    backoffMaxMs = LIVE_INDEX_BACKOFF_MAX_MS,
    staleAfterMs = LIVE_INDEX_STALE_AFTER_MS,
  }: UseLiveIndexSeriesOptions = {},
): LiveIndexSeries => {
  const isFocused = useIsFocused();
  const isActive = enabled && isFocused && eventId !== undefined;
  const seriesKey = `${venueId}:${eventId ?? ''}`;
  const [held, setHeld] = useState<{
    key: string;
    series: LiveIndexSeries;
  }>({ key: seriesKey, series: IDLE_SERIES });

  useEffect(() => {
    if (!isActive || eventId === undefined) {
      return undefined;
    }

    const flushEvery = Math.max(flushIntervalMs, LIVE_INDEX_FLUSH_INTERVAL_MS);
    const bufferOptions = { maxPoints, minPointGapMs };
    let buffer: PredictIndexPoint[] = [];
    let latest: PredictIndexLive | undefined;
    let status: LiveIndexSeriesStatus = 'loading';
    let errorCount = 0;
    let watching = false;
    let disposed = false;
    let dirty = false;
    let lastFlushAt = Number.NEGATIVE_INFINITY;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let staleTimer: ReturnType<typeof setTimeout> | undefined;

    const flush = () => {
      if (!dirty || disposed) {
        return;
      }
      dirty = false;
      lastFlushAt = Date.now();
      setHeld({
        key: seriesKey,
        series: { status, points: buffer.slice(), latest, errorCount },
      });
    };

    // Leading and trailing throttle: at most one state update per interval.
    const scheduleFlush = () => {
      dirty = true;
      if (flushTimer !== undefined) {
        return;
      }
      const wait = flushEvery - (Date.now() - lastFlushAt);
      if (wait <= 0) {
        flush();
        return;
      }
      flushTimer = setTimeout(() => {
        flushTimer = undefined;
        flush();
      }, wait);
    };

    const watch = () => {
      if (!watching) {
        watching = true;
        watchIndex(venueId, eventId);
      }
    };

    const unwatch = () => {
      if (watching) {
        watching = false;
        unwatchIndex(venueId, eventId);
      }
    };

    const armStaleTimer = () => {
      clearTimeout(staleTimer);
      staleTimer = setTimeout(() => {
        staleTimer = undefined;
        if (status === 'loading' || status === 'live') {
          status = 'stale';
          scheduleFlush();
        }
      }, staleAfterMs);
    };

    const onGoodFrame = () => {
      errorCount = 0;
      if (retryTimer !== undefined) {
        // Another surface still holds the Event and frames flow: no need to
        // wait out the backoff.
        clearTimeout(retryTimer);
        retryTimer = undefined;
        watch();
      }
      if (latest?.settlementAverage?.final) {
        status = 'final';
        clearTimeout(staleTimer);
        staleTimer = undefined;
      } else {
        status = 'live';
        armStaleTimer();
      }
      scheduleFlush();
    };

    const onSnapshot = (snapshot: PredictIndexSnapshot) => {
      if (snapshot.venueId !== venueId || snapshot.eventId !== eventId) {
        return;
      }
      const { points, ...tick } = snapshot;
      if (latest && isOlderLiveFrame(tick, latest)) {
        return;
      }
      buffer = toOrderedIndexPoints(points, bufferOptions);
      latest = tick;
      onGoodFrame();
    };

    const onTick = (tick: PredictIndexLive) => {
      if (tick.venueId !== venueId || tick.eventId !== eventId) {
        return;
      }
      if (latest && isOlderLiveFrame(tick, latest)) {
        return;
      }
      appendIndexPoint(
        buffer,
        { time: tick.observedAt, value: tick.average60s },
        bufferOptions,
      );
      latest = tick;
      onGoodFrame();
    };

    const onFailure = (error: PredictIndexError) => {
      if (error.venueId !== venueId || error.eventId !== eventId) {
        return;
      }
      // The window ended. No error counts after its final frame.
      if (status === 'final') {
        return;
      }
      // Frames of a repeating error wait out the backoff already running.
      if (retryTimer !== undefined || status === 'stopped') {
        return;
      }
      errorCount += 1;
      clearTimeout(staleTimer);
      staleTimer = undefined;
      unwatch();

      if (errorCount >= maxErrors) {
        status = 'stopped';
        Logger.log(
          'useLiveIndexSeries: stopped after repeated index errors',
          error.code,
        );
        scheduleFlush();
        return;
      }

      status = 'stale';
      scheduleFlush();
      retryTimer = setTimeout(
        () => {
          retryTimer = undefined;
          watch();
          armStaleTimer();
        },
        Math.min(backoffMaxMs, backoffBaseMs * 2 ** (errorCount - 1)),
      );
    };

    // The server let the Event go (a window closed more than 30 s ago) and
    // the service has dropped our watch. Not an error: the window is over.
    // While we are in a backoff we hold no watch, so this does not apply.
    const onReleased = (released: {
      venueId: PredictVenueId;
      eventId: PredictEntityId;
    }) => {
      if (
        released.venueId !== venueId ||
        released.eventId !== eventId ||
        !watching
      ) {
        return;
      }
      watching = false;
      clearTimeout(staleTimer);
      staleTimer = undefined;
      status = 'final';
      scheduleFlush();
    };

    // Listen before watching: the service replays its last snapshot
    // synchronously when another surface already holds the Event.
    const messenger = Engine.controllerMessenger;
    const snapshotEvent =
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:indexSnapshotUpdated` as const;
    const tickEvent = `${PREDICT_LIVE_DATA_SERVICE_NAME}:indexUpdated` as const;
    const failedEvent =
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:indexFailed` as const;
    const releasedEvent =
      `${PREDICT_LIVE_DATA_SERVICE_NAME}:indexReleased` as const;
    messenger.subscribe(snapshotEvent, onSnapshot);
    messenger.subscribe(tickEvent, onTick);
    messenger.subscribe(failedEvent, onFailure);
    messenger.subscribe(releasedEvent, onReleased);

    // Drop what an earlier session left (a stopped or stale series). This
    // does not start the flush interval, so a replayed frame still shows now.
    setHeld((previous) =>
      previous.key === seriesKey && previous.series === IDLE_SERIES
        ? previous
        : {
            key: seriesKey,
            series: { ...IDLE_SERIES, status: 'loading' },
          },
    );
    watch();
    armStaleTimer();

    return () => {
      disposed = true;
      messenger.unsubscribe(snapshotEvent, onSnapshot);
      messenger.unsubscribe(tickEvent, onTick);
      messenger.unsubscribe(failedEvent, onFailure);
      messenger.unsubscribe(releasedEvent, onReleased);
      clearTimeout(flushTimer);
      clearTimeout(retryTimer);
      clearTimeout(staleTimer);
      unwatch();
    };
  }, [
    isActive,
    venueId,
    eventId,
    seriesKey,
    maxPoints,
    minPointGapMs,
    flushIntervalMs,
    maxErrors,
    backoffBaseMs,
    backoffMaxMs,
    staleAfterMs,
  ]);

  return useMemo(() => {
    const series = held.key === seriesKey ? held.series : IDLE_SERIES;
    if (!isActive) {
      return series === IDLE_SERIES ? series : { ...series, status: 'idle' };
    }
    return series.status === 'idle' ? { ...series, status: 'loading' } : series;
  }, [held, seriesKey, isActive]);
};
