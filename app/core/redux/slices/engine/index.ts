import { cloneDeep } from 'lodash';
import Engine from '../../../Engine';
import { createAction, PayloadAction } from '@reduxjs/toolkit';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { PersistedSnap } from '@metamask/snaps-utils';
///: END:ONLY_INCLUDE_IF

const initialState = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backgroundState: {} as any,
};

const legacyControllers = ['TransactionController'];

// Create an action to initialize the background state
export const initBgState = createAction('INIT_BG_STATE');

// Create an action to update the background state
export const updateBgState = createAction('UPDATE_BG_STATE', (key) => ({
  payload: key,
}));

/**
 * Filters out state values that we do not want to include in the Redux store.
 *
 * @param key The state key, which should also be the controller name.
 * @param value The state blob for a controller.
 * @returns A filtered state blob for a given controller.
 */
function filterState(key: string, value: any) {
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  if (key === 'SnapController') {
    return {
      snapStates: {},
      unencryptedSnapStates: {},
      snaps: Object.values(value.snaps as Record<string, PersistedSnap>).reduce<
        Record<string, Omit<PersistedSnap, 'sourceCode'>>
      >((acc, snap) => {
        // eslint-disable-next-line no-unused-vars
        const { sourceCode, auxiliaryFiles, ...rest } = snap;
        acc[snap.id] = rest;
        return acc;
      }, {}),
    };
  }
  ///: END:ONLY_INCLUDE_IF

  return value;
}

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const counter: any = {};
const engineReducer = (
  // eslint-disable-next-line @typescript-eslint/default-param-last
  state = initialState,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: PayloadAction<{ key: any } | undefined>,
) => {
  switch (action.type) {
    case initBgState.type: {
      return { backgroundState: Engine.state };
    }
    case updateBgState.type: {
      const newState = { ...state };

      if (action.payload) {
        const newControllerState =
          Engine.state[action.payload.key as keyof typeof Engine.state];

        // The BaseControllerV1 controllers modify the original state object on update,
        // rather than replacing it as done in BaseControllerV2.
        // This introduces two issues:
        // - Memoized selectors do not fire on nested objects since the references don't change.
        // - Deep comparison selectors do not fire since the cached objects are references to the original
        //  state object which has been mutated.
        // This is resolved by doing a deep clone in this scenario to force an entirely new object.
        newState.backgroundState[action.payload?.key] = filterState(
          action.payload.key,
          legacyControllers.includes(action.payload.key)
            ? cloneDeep(newControllerState)
            : newControllerState,
        );
      }

      return newState;
    }
    default:
      return state;
  }
};

export default engineReducer;
