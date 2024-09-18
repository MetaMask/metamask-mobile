import { REHYDRATE } from 'redux-persist';

type OnboardingWizardAction =
  | { type: 'SET_ONBOARDING_WIZARD_STEP'; step: number }
  | { type: typeof REHYDRATE };

const initialState: { step: number } = {
  step: 0,
};

const onboardingWizardReducer = (
  state: { step: number } = initialState,
  action: OnboardingWizardAction
): { step: number } => {
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
