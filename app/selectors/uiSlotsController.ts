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

export const makeSelectUiSlot = (screenId: UiSlotsScreenId, slotId: string) =>
  createSelector(
    selectUiSlotsControllerState,
    selectBasicFunctionalityEnabledForRemoteFlags,
    (state, basicFunctionalityEnabled) => {
      if (!basicFunctionalityEnabled || !state?.enabled) {
        return undefined;
      }
      const configurationKey = state.activeConfigurationKeys[screenId];
      return configurationKey
        ? state.renderedConfigurations[configurationKey]?.slotsById[slotId]
        : undefined;
    },
  );

export type UiSlotResolution =
  | { status: 'fallback' }
  | { status: 'empty' }
  | { status: 'ready'; slot: UiSlot };

export const makeSelectUiSlotResolution = (
  screenId: UiSlotsScreenId,
  slotId: string,
) =>
  createSelector(
    selectUiSlotsControllerState,
    selectBasicFunctionalityEnabledForRemoteFlags,
    (state, basicFunctionalityEnabled): UiSlotResolution => {
      if (!basicFunctionalityEnabled || !state?.enabled) {
        return { status: 'fallback' };
      }
      const configurationKey = state.activeConfigurationKeys[screenId];
      const rendered = configurationKey
        ? state.renderedConfigurations[configurationKey]
        : undefined;
      if (!rendered) {
        return { status: 'fallback' };
      }
      const slot = rendered.slotsById[slotId];
      return slot ? { status: 'ready', slot } : { status: 'empty' };
    },
  );

export const makeSelectUiSlotsRequestStatus = (screenId: UiSlotsScreenId) =>
  createSelector(
    selectUiSlotsControllerState,
    (state) => state?.requestStatus[screenId] ?? 'idle',
  );

export const selectUiSlotsEnabled = createSelector(
  selectUiSlotsControllerState,
  selectBasicFunctionalityEnabledForRemoteFlags,
  (state, basicFunctionalityEnabled) =>
    basicFunctionalityEnabled && (state?.enabled ?? false),
);
