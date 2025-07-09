import { useSelector } from 'react-redux';
import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';

const selectPerpsError = createSelector(
  (state: RootState) => state.engine.backgroundState.PerpsController?.lastError,
  (state: RootState) => state.engine.backgroundState.PerpsController?.lastUpdateTimestamp,
  (lastError, lastUpdateTimestamp): {
    error: string | null;
    timestamp: number;
    hasError: boolean;
  } => ({
    error: lastError || null,
    timestamp: lastUpdateTimestamp || 0,
    hasError: Boolean(lastError)
  })
);

/**
 * Hook to get the last error from PerpsController
 */
export function usePerpsError(): {
  error: string | null;
  timestamp: number;
  hasError: boolean;
} {
  return useSelector(selectPerpsError);
}
