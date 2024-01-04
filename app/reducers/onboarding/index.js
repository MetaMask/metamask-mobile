const initialState = {
  events: [],
  strategy: undefined,
};

/**
 * Reducer to keep track of user oboarding actions to send it to analytics if the user
 * decides to optin after finishing onboarding flow
 */
const onboardingReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SAVE_EVENT':
      return {
        ...state,
        events: [...state.events, action.event],
      };
    case 'CLEAR_EVENTS':
      return {
        ...state,
        events: [],
      };
    case 'SET_STRATEGY':
      return {
        ...state,
        strategy: action.strategy,
      };
    default:
      return state;
  }
};

export default onboardingReducer;
