import { useSelector } from 'react-redux';
import type { Selector } from 'reselect';
import type { EarnControllerState } from '@metamask/earn-controller';
import { RootState } from '../../../../reducers';

/**
 * A hook that adapts earn controller selectors to work with the client's state structure.
 * This allows us to use the earn controller selectors without being tightly coupled to its state structure.
 *
 * @param selector - A selector from the earn controller
 * @returns The selected value from the earn state
 */
export function useEarnSelector<T>(
  selector: Selector<EarnControllerState, T>,
): T {
  return useSelector((state: RootState) =>
    selector(state.engine.backgroundState.EarnController),
  );
}
