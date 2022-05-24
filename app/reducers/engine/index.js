import Engine from '../../core/Engine';

const initialState = {
  backgroundState: {},
};

const engineReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'INIT_BG_STATE':
      return { backgroundState: Engine.state };
    case 'UPDATE_BG_STATE': {
      let newState = { ...state };
      switch (action.key) {
        case 'TokensController': {
          newState = {
            ...state,
            backgroundState: {
              ...state.backgroundState,
              [action.key]: {
                ...Engine.state[action.key],
                tokens: [...Engine.state[action.key].tokens],
                ignoredTokens: [...Engine.state[action.key].ignoredTokens],
                detectedTokens: [...Engine.state[action.key].detectedTokens],
              },
            },
          };
          break;
        }
        default:
          newState.backgroundState[action.key] = Engine.state[action.key];
      }
      return newState;
    }
    default:
      return state;
  }
};

export default engineReducer;
