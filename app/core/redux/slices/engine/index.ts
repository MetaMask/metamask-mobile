import Engine from '../../../Engine';
import { createAction, PayloadAction } from '@reduxjs/toolkit';

const initialState = {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backgroundState: {} as any,
};

// Create an action to initialize the background state
export const initBgState = createAction('INIT_BG_STATE');

// Create an action to update the background state
export const updateBgState = createAction(
  'UPDATE_BG_STATE',
  (args: { key: string | string[] }) => ({
    payload: args,
  }),
);

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
      if (!action.payload) return state;
      const keys = Array.isArray(action.payload.key)
        ? action.payload.key
        : [action.payload.key];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextBgState = { ...state.backgroundState } as Record<string, any>;
      keys.forEach((k) => {
        nextBgState[k] = Engine.state[k as keyof typeof Engine.state];
      });

      return {
        ...state,
        backgroundState: nextBgState,
      };
    }
    default:
      return state;
  }
};

export default engineReducer;
