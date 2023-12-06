import { REHYDRATE, persistReducer } from 'redux-persist';
import MigratedStorage from '../../storage/MigratedStorage';

const initialState = {
  step: 0,
};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    case REHYDRATE:
      return {
        ...initialState,
      };
    case 'SET_ONBOARDING_WIZARD_STEP':
      return {
        ...state,
        step: action.step,
      };
    default:
      return state;
  }
};

const wizardPersistConfig = {
  key: 'wizard',
  blacklist: [],
  storage: MigratedStorage,
};

const onboardingWizardReducer = persistReducer(wizardPersistConfig, reducer);

export default onboardingWizardReducer;
