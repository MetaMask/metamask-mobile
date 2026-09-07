import { createSelector } from 'reselect';
import type { RootState } from '../reducers';
import type {
  UiSlotsControllerState,
  UiSlot,
  UiSlotsScreenId,
} from '../core/Engine/controllers/ui-slots-controller/types';
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

export const makeSelectUiSlot = () =>
  createSelector(
    [
      selectUiSlotsControllerState,
      (_state: RootState, screenId: UiSlotsScreenId) => screenId,
      (_state: RootState, _screenId: UiSlotsScreenId, slotId: string) => slotId,
    ],
    (state, screenId, slotId): UiSlot | undefined =>
      state?.activeConfigurations[screenId]?.slotsById[slotId],
  );

export const makeSelectHasActiveUiSlotsConfiguration = () =>
  createSelector(
    [
      selectUiSlotsControllerState,
      (_state: RootState, screenId: UiSlotsScreenId) => screenId,
    ],
    (state, screenId) => Boolean(state?.activeConfigurations[screenId]),
  );
