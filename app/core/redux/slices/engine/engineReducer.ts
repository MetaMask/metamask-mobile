import Engine from '../../../Engine';

const initialState = {
  backgroundState: {},
};

const engineReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'INIT_BG_STATE':
      return { backgroundState: Engine.state };
    case 'UPDATE_BG_STATE': {
      const newState = { ...state };
      console.log('Payload key ======>:', action.key);
      console.log('ENGINE STATE:', Engine.state[action.key]);
      newState.backgroundState[action.key] = Engine.state[action.key];
      return newState;
    }
    default:
      return state;
  }
};

export default engineReducer;
