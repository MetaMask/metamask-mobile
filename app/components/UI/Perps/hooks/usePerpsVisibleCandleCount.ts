import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  clampVisibleCandleCount,
  PERPS_CHART_CONFIG,
} from '../constants/chartConfig';
import { selectPerpsVisibleCandleCount } from '../selectors/perpsController';

const VISIBLE_CANDLE_COUNT_PERSIST_DEBOUNCE_MS = 400;

export interface UsePerpsVisibleCandleCountReturn {
  /** Viewport candle count to feed the live chart. Stable during pinch. */
  visibleCandleCount: number;
  /** Debounced persist of a pinch/zoom candle count. */
  onVisibleCandleCountChange: (count: number) => void;
}

/**
 * Read and persist the number of candles shown on Lite and Pro charts.
 *
 * The count lives on `PerpsController.visibleCandleCount` so it is shared
 * across markets and survives app restarts. Pinch updates are debounced so
 * a gesture does not write controller state on every frame.
 */
export const usePerpsVisibleCandleCount = (
  symbol?: string,
): UsePerpsVisibleCandleCountReturn => {
  const persistedCount = useSelector(selectPerpsVisibleCandleCount);
  const initialCount = clampVisibleCandleCount(
    typeof persistedCount === 'number'
      ? persistedCount
      : PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT,
  );
  const [visibleCandleCount, setVisibleCandleCount] = useState(initialCount);
  const viewportRef = useRef(initialCount);
  const visibleCountRef = useRef(initialCount);
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCountRef = useRef<number | null>(null);

  const persistCount = useCallback((count: number) => {
    Engine.context.PerpsController.setVisibleCandleCount(count);
  }, []);

  const flushPending = useCallback(() => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }
    const pending = pendingCountRef.current;
    if (pending === null) {
      return;
    }
    pendingCountRef.current = null;
    persistCount(pending);
    // Local state is expected to be updated immediately during the pinch
    // gesture; this is just a final confirmation before unmount/symbol
    // changes.
    visibleCountRef.current = pending;
    setVisibleCandleCount(pending);
  }, [persistCount]);

  const onVisibleCandleCountChange = useCallback(
    (count: number) => {
      const clamped = clampVisibleCandleCount(count);
      if (clamped === viewportRef.current && pendingCountRef.current === null) {
        return;
      }
      viewportRef.current = clamped;
      pendingCountRef.current = clamped;
      // Update the chart immediately so refresh/remount actions use the
      // in-progress pinch zoom value, not the previous persisted one.
      if (clamped !== visibleCountRef.current) {
        visibleCountRef.current = clamped;
        setVisibleCandleCount(clamped);
      }
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
      persistTimeoutRef.current = setTimeout(() => {
        persistTimeoutRef.current = null;
        const next = pendingCountRef.current;
        pendingCountRef.current = null;
        if (next === null) {
          return;
        }
        persistCount(next);
        // Local state should already be correct; keep the ref in sync
        // regardless.
        visibleCountRef.current = next;
        setVisibleCandleCount(next);
      }, VISIBLE_CANDLE_COUNT_PERSIST_DEBOUNCE_MS);
    },
    [persistCount],
  );

  useEffect(() => {
    flushPending();
    setVisibleCandleCount(viewportRef.current);
    visibleCountRef.current = viewportRef.current;
  }, [flushPending, symbol]);

  useEffect(
    () => () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
      if (pendingCountRef.current !== null) {
        Engine.context.PerpsController.setVisibleCandleCount(
          pendingCountRef.current,
        );
      }
    },
    [],
  );

  return { visibleCandleCount, onVisibleCandleCountChange };
};
