import { RootState } from '../../reducers';
import { createSelector } from 'reselect';

const selectWizard = (state: RootState) => state.wizard;

export const selectCurrentOnboardingStep = createSelector(
  selectWizard,
  (wizardState: Record<string, unknown>) => wizardState.step as number,
);
