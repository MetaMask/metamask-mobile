import Engine from '../../../Engine';
import { createAction, PayloadAction } from '@reduxjs/toolkit';

/**
 * 🧪 EXPERIMENTAL: Filter preinstalled snaps from SnapController state for Redux.
 * This ensures Redux state matches our filtered persistence layer.
 */
const filterSnapsForRedux = (controllerName: string, controllerState: any) => {
  if (controllerName === 'SnapController' && controllerState?.snaps) {
    console.log('🔧 [REDUX FILTER] Filtering snaps from Redux update');
    return {
      ...controllerState,
      snaps: {}, // Remove all snaps (they appear to be preinstalled)
    };
  }
  return controllerState;
};

const initialState = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backgroundState: {} as any,
};

// Create an action to initialize the background state
export const initBgState = createAction('INIT_BG_STATE');

// Create an action to update the background state
export const updateBgState = createAction('UPDATE_BG_STATE', (key) => ({
  payload: key,
}));

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
      // Apply snap filtering to the entire initial state
      const filteredState: any = {};
      Object.keys(Engine.state).forEach((controllerName) => {
        const controllerState = Engine.state[controllerName as keyof typeof Engine.state];
        filteredState[controllerName] = filterSnapsForRedux(controllerName, controllerState);
      });
      return { backgroundState: filteredState };
    }
    case updateBgState.type: {
      if (!action.payload) return state;

      const controllerName = action.payload.key;
      const rawControllerState = Engine.state[controllerName as keyof typeof Engine.state];
      const filteredControllerState = filterSnapsForRedux(controllerName, rawControllerState);

      return {
        ...state,
        backgroundState: {
          ...state.backgroundState,
          [controllerName]: filteredControllerState,
        },
      };
    }
    default:
      return state;
  }
};

export default engineReducer;
