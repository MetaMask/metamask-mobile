import Engine from '../../../Engine';
import { createAction, PayloadAction } from '@reduxjs/toolkit';

const initialState = {
  backgroundState: {} as any,
};

// Create an action to initialize the background state
export const initBgState = createAction('INIT_BG_STATE');

// Create an action to update the background state
export const updateBgState = createAction('UPDATE_BG_STATE', (key) => ({
  payload: key,
}));

export const counter: any = {};
const engineReducer = (
  // eslint-disable-next-line @typescript-eslint/default-param-last
  state = initialState,
  action: PayloadAction<{ key: any } | undefined>,
) => {
  switch (action.type) {
    case initBgState.type: {
      return { backgroundState: Engine.state };
    }
    case updateBgState.type: {
      const newState = { ...state };
      if (action.payload) {
        newState.backgroundState[action.payload?.key] =
          Engine.state[action.payload.key as keyof typeof Engine.state];
      }
      return newState;
    }
    default:
      return state;
  }
};

export default engineReducer;
