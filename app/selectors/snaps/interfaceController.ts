import { createDeepEqualSelector } from '../util';
import { RootState } from '../../reducers';

/**
 * Get the Snap interfaces from the redux state.
 *
 * @param state - Redux state object.
 * @returns the Snap interfaces.
 */
const getInterfaces = (state: RootState) =>
  state?.engine?.backgroundState?.SnapInterfaceController.interfaces;

/**
 * Input selector providing a way to pass a Snap interface ID as an argument.
 *
 * @param _state - Redux state object.
 * @param interfaceId - ID of a Snap interface.
 * @returns ID of a Snap Interface that can be used as input selector.
 */
const selectInterfaceId = (_state: RootState, interfaceId: string) =>
  interfaceId;

/**
 * Get a Snap Interface with a given ID.
 */
export const getInterface = createDeepEqualSelector(
  [getInterfaces, selectInterfaceId],
  (interfaces, id) => interfaces?.[id],
);
