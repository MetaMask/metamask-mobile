import { useCallback, useSyncExternalStore } from 'react';
import { getAlignedWindowStartMs } from './windowClock';

/**
 * One shared one-second clock for every window card on screen. All
 * subscribers re-render on the same tick, and the timer stops when the last
 * subscriber leaves. Moved from `PredictCryptoUpDownMarketCard` without
 * behaviour change.
 */

const CLOCK_UPDATE_OFFSET_MS = 50;

interface SharedClock {
  listeners: Set<() => void>;
  nowMs: number;
  timeout: ReturnType<typeof setTimeout> | undefined;
}

const sharedClock: SharedClock = {
  listeners: new Set(),
  nowMs: Date.now(),
  timeout: undefined,
};

/**
 * Test-only: resets the shared clock so tests don't leak listeners or
 * timers across cases. Mirrors the reference-counter teardown used by
 * `PredictPreviewSheetContext` (PR #30219).
 */
export const __resetCardClockForTest = () => {
  if (sharedClock.timeout) {
    clearTimeout(sharedClock.timeout);
  }
  sharedClock.listeners.clear();
  sharedClock.timeout = undefined;
  sharedClock.nowMs = Date.now();
};

const scheduleClockTick = () => {
  const delayMs = 1000 - (Date.now() % 1000) + CLOCK_UPDATE_OFFSET_MS;

  sharedClock.timeout = setTimeout(() => {
    sharedClock.timeout = undefined;
    sharedClock.nowMs = Date.now();
    sharedClock.listeners.forEach((listener) => listener());

    if (sharedClock.listeners.size > 0) {
      scheduleClockTick();
    }
  }, delayMs);
};

const subscribeClock = (listener: () => void) => {
  sharedClock.listeners.add(listener);
  sharedClock.nowMs = Date.now();

  if (!sharedClock.timeout) {
    scheduleClockTick();
  }

  return () => {
    sharedClock.listeners.delete(listener);

    if (sharedClock.listeners.size === 0 && sharedClock.timeout) {
      clearTimeout(sharedClock.timeout);
      sharedClock.timeout = undefined;
    }
  };
};

const getClockSnapshot = () => sharedClock.nowMs;

export const useSharedNowMs = () =>
  useSyncExternalStore(subscribeClock, getClockSnapshot, getClockSnapshot);

export const useSharedSeriesWindowMs = (durationMs: number) => {
  const getWindowSnapshot = useCallback(
    () => getAlignedWindowStartMs(durationMs, sharedClock.nowMs),
    [durationMs],
  );

  return useSyncExternalStore(
    subscribeClock,
    getWindowSnapshot,
    getWindowSnapshot,
  );
};

export const useSharedBucketedNowMs = (bucketMs: number) => {
  const getBucketSnapshot = useCallback(
    () => Math.floor(sharedClock.nowMs / bucketMs) * bucketMs,
    [bucketMs],
  );

  return useSyncExternalStore(
    subscribeClock,
    getBucketSnapshot,
    getBucketSnapshot,
  );
};
