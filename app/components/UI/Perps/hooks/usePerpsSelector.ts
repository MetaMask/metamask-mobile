import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import type { PerpsControllerState } from '../controllers/PerpsController';

/**
 * Generic hook for selecting data from PerpsController state
 * @param selector - Function that takes PerpsController state and returns selected data
 * @returns Selected data from PerpsController state
 */
export function usePerpsSelector<T>(
  selector: (state: PerpsControllerState) => T,
): T {
  return useSelector((state: RootState) =>
    selector(state.engine?.backgroundState?.PerpsController),
  );
}
