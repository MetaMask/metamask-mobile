import Engine from '../../../Engine';
// import { EngineState } from '../../../../selectors/types';
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
      // console.log('Init Action:', Engine);
      return { backgroundState: Engine.state };
    }
    case updateBgState.type: {
      const newState = { ...state };
      newState.backgroundState[action.payload?.key] =
        Engine.state[action.payload.key];
      return newState;
    }
    default:
      return state;
  }
};

export default engineReducer;
