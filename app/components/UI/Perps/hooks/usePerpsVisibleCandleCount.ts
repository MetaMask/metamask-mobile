import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsVisibleCandleCount } from '../selectors/perpsController';

export interface UsePerpsVisibleCandleCountReturn {
  /** Visible candle count shared by Lite and Pro charts. */
  visibleCandleCount: number;
  /**
   * Persist the visible candle count. No-ops when the value is unchanged so
   * pinch-zoom settle does not write redundant controller state.
   */
  setVisibleCandleCount: (count: number) => void;
}

/**
 * Read and update the persisted visible candle count.
 *
 * Shared by Lite and Pro charts, global across markets and app restarts via
 * `PerpsController.visibleCandleCount`. The controller clamps writes to 10–250.
 */
export const usePerpsVisibleCandleCount =
  (): UsePerpsVisibleCandleCountReturn => {
    const visibleCandleCount = useSelector(selectPerpsVisibleCandleCount);

    const setVisibleCandleCount = useCallback(
      (count: number) => {
        if (count === visibleCandleCount) {
          return;
        }
        Engine.context.PerpsController.setVisibleCandleCount(count);
      },
      [visibleCandleCount],
    );

    return { visibleCandleCount, setVisibleCandleCount };
  };
