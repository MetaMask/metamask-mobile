import { REHYDRATE } from 'redux-persist';

type OnboardingWizardAction =
  | { type: 'SET_ONBOARDING_WIZARD_STEP'; step: number }
  | { type: typeof REHYDRATE };

const initialState: { step: number } = {
  step: 0,
};

const onboardingWizardReducer = (
  action: OnboardingWizardAction,
  state = initialState
): { step: number } => { //DEVIN_TODO: Confirm if this return type is correct
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

export default onboardingWizardReducer;
