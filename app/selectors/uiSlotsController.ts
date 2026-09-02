import { createSelector } from 'reselect';
import type { RootState } from '../reducers';
import type { UiSlotsControllerState } from '../core/Engine/controllers/ui-slots-controller/types';
import { selectBasicFunctionalityEnabledForRemoteFlags } from './featureFlagController';

export const selectUiSlotsControllerState = (
  state: RootState,
): UiSlotsControllerState | undefined =>
  state.engine.backgroundState.UiSlotsController;

export const selectUiSlotsEnabled = createSelector(
  selectUiSlotsControllerState,
  selectBasicFunctionalityEnabledForRemoteFlags,
  (state, basicFunctionalityEnabled) =>
    basicFunctionalityEnabled && (state?.enabled ?? false),
);
