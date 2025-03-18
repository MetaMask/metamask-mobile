import { selectCurrentOnboardingStep } from '.';
import { RootState } from '../../reducers';

describe('Wizard Selectors', () => {
  const mockState = {
    wizard: {
      step: 3,
    },
  } as unknown as RootState;

  it('selectCurrentOnboardingStep returns correct value', () => {
    expect(selectCurrentOnboardingStep(mockState)).toEqual(
      mockState.wizard.step,
    );
  });
});
