import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPerpsVisibleCandleCount } from '../selectors/perpsController';

export interface UsePerpsVisibleCandleCountReturn {
  visibleCandleCount: number;
  setVisibleCandleCount: (count: number) => void;
}

/**
 * Read and update the persisted visible candle count shared by Lite and Pro.
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
