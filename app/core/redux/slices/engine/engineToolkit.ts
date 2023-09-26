// const initialState = {
//   backgroundState: {},
// };

// const engineReducer = (state = initialState, action) => {
//   switch (action.type) {
//     case 'INIT_BG_STATE':
//       return { backgroundState: Engine.state };
//     case 'UPDATE_BG_STATE': {
//       const newState = { ...state };
//       newState.backgroundState[action.key] = Engine.state[action.key];
//       return newState;
//     }
//     default:
//       return state;
//   }
// };

import Engine from '../../../Engine';
import { createAction, createReducer } from '@reduxjs/toolkit';

export const initBgState = createAction('INIT_BG_STATE');

export const updateBgState = createAction('UPDATE_BG_STATE', (key) => ({
  payload: key,
}));

const initialState = {
  backgroundState: {},
};

const engineReducer = createReducer(initialState, (builder) => {
  builder
    .addCase(initBgState, (state) => {
      state.backgroundState = { ...Engine.state };
    })
    .addCase(updateBgState, (state, action) => {
      const { payload: key } = action;
      console.log('Payload key ======>:', key);
      console.log('ENGINE STATE:', Engine.state[key]);
      state.backgroundState[key] = Engine.state[key];
    });
});

export default engineReducer;
