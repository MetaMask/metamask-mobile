import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../reducers';
import { createDeepEqualSelector } from '../util';

export const selectInterfaceControllerState = (state: RootState) =>
  state.engine.backgroundState.SnapInterfaceController;

export const selectInterfaces = createSelector(
  selectInterfaceControllerState,
  (controller) => controller.interfaces,
);

export const selectInterface = createSelector(
  [selectInterfaces, (_state: RootState, interfaceId: string) => interfaceId],
  (interfaces, id) => interfaces[id],
);

export const selectMemoizedInterface = createDeepEqualSelector(
  selectInterface,
  (snapInterface) => snapInterface,
);
