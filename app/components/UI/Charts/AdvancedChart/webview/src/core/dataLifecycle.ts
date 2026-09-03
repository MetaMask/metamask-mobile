// Lightweight event bus for data lifecycle events overlays need to react to.
//
// The widget modules (ohlcvIngestion, pagination, visibleRange) publish
// events after they mutate the OHLCV series or the visible range;
// overlay modules (tradeMarkers, positionLines) subscribe and re-place
// their shapes. Keeps overlays decoupled from widget/* — overlays never
// import from widget/*, matching the ESLint `no-restricted-paths`
// direction described in the plan.
//
// The events are intentionally void — subscribers read whatever state
// they need from core/state.ts. Errors inside a subscriber are logged
// to RN so a broken overlay doesn't take the widget down with it.

import { reportErrorToRN } from './bridge';

export type DataLifecycleEvent =
  | 'ohlcvReset'
  | 'ohlcvPrepended'
  | 'visibleRangeChanged';

type Listener = () => void;

const listeners: Record<DataLifecycleEvent, Listener[]> = {
  ohlcvReset: [],
  ohlcvPrepended: [],
  visibleRangeChanged: [],
};

export function onDataLifecycle(
  event: DataLifecycleEvent,
  listener: Listener,
): () => void {
  listeners[event].push(listener);
  return () => {
    const bucket = listeners[event];
    const idx = bucket.indexOf(listener);
    if (idx !== -1) bucket.splice(idx, 1);
  };
}

export function notifyDataLifecycle(event: DataLifecycleEvent): void {
  const bucket = listeners[event];
  for (const listener of bucket) {
    try {
      listener();
    } catch (error) {
      reportErrorToRN(error);
    }
  }
}

/** Test-only: clear every listener across every event. */
export function __resetDataLifecycleForTests(): void {
  listeners.ohlcvReset = [];
  listeners.ohlcvPrepended = [];
  listeners.visibleRangeChanged = [];
}
