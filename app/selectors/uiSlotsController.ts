import { createSelector } from 'reselect';
import type { RootState } from '../reducers';
import type {
  UiSlot,
  UiSlotsScreenId,
  UiSlotsControllerState,
} from '../core/Engine/controllers/ui-slots-controller/types';
import { selectBasicFunctionalityEnabledForRemoteFlags } from './featureFlagController';

export const selectUiSlotsControllerState = (
  state: RootState,
): UiSlotsControllerState | undefined =>
  state.engine.backgroundState.UiSlotsController;

export type UiSlotResolution =
  | { status: 'fallback' }
  | { status: 'empty' }
  | { status: 'ready'; slot: UiSlot };

const FALLBACK_RESOLUTION: UiSlotResolution = { status: 'fallback' };
const EMPTY_RESOLUTION: UiSlotResolution = { status: 'empty' };

export const selectUiSlotsEnabled = createSelector(
  selectUiSlotsControllerState,
  selectBasicFunctionalityEnabledForRemoteFlags,
  (state, basicFunctionalityEnabled) =>
    basicFunctionalityEnabled && (state?.enabled ?? false),
);

/**
 * Inputs stay narrowed to the individual slot so unrelated controller writes
 * (another screen activating, a cache eviction) cannot re-render the host.
 */
export const makeSelectUiSlotResolution = (
  screenId: UiSlotsScreenId,
  slotId: string,
) =>
  createSelector(
    (state: RootState) =>
      selectUiSlotsControllerState(state)?.activeConfigurations[screenId]
        ?.slotsById[slotId],
    (state: RootState) =>
      Boolean(
        selectUiSlotsControllerState(state)?.activeConfigurations[screenId],
      ),
    selectUiSlotsEnabled,
    (slot, hasActiveConfiguration, enabled): UiSlotResolution => {
      if (!enabled || !hasActiveConfiguration) {
        return FALLBACK_RESOLUTION;
      }
      return slot ? { status: 'ready', slot } : EMPTY_RESOLUTION;
    },
  );
