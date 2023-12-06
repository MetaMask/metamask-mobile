import MigratedStorage from '../../storage/MigratedStorage';
import { persistReducer } from 'redux-persist';

const initialState = {
  events: [],
};

/**
 * Reducer to keep track of user oboarding actions to send it to analytics if the user
 * decides to optin after finishing onboarding flow
 */
const reducer = (state = initialState, action) => {
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
    default:
      return state;
  }
};

const onboardingPersistConfig = {
  key: 'onboarding',
  blacklist: ['onboarding'],
  storage: MigratedStorage,
};

const onboardingReducer = persistReducer(onboardingPersistConfig, reducer);

export default onboardingReducer;
