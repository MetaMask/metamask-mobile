import { createSelector } from '@reduxjs/toolkit';
import { createDeepEqualSelector } from '../util';

/**
 * Get the Snap interfaces from the redux state.
 *
 * @param state - Redux state object.
 * @returns the Snap interfaces.
 */
const getInterfaces = (state: any) =>
  state?.engine?.backgroundState?.SnapInterfaceController.interfaces;

/**
 * Input selector providing a way to pass a Snap interface ID as an argument.
 *
 * @param _state - Redux state object.
 * @param interfaceId - ID of a Snap interface.
 * @returns ID of a Snap Interface that can be used as input selector.
 */
const selectInterfaceId = (_state: any, interfaceId: string) => interfaceId;

/**
 * Get a memoized version of the Snap interfaces.
 */
export const getMemoizedInterfaces = createDeepEqualSelector(
  getInterfaces,
  (interfaces) => interfaces,
);

/**
 * Get a Snap Interface with a given ID.
 */
export const getInterface = createSelector(
  [getMemoizedInterfaces, selectInterfaceId],
  (interfaces, id) => interfaces[id],
);

/**
 * Get a memoized version of a Snap interface with a given ID
 */
export const getMemoizedInterface = createDeepEqualSelector(
  getInterface,
  (snapInterface) => snapInterface,
);
