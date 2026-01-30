import { selectCompletedOnboarding } from '.';
import { RootState } from '../../reducers';

describe('Onboarding selectors', () => {
  const mockState = {
    onboarding: {
      completedOnboarding: true,
    },
  } as RootState;

  it('returns the correct value for selectCompletedOnboarding', () => {
    expect(selectCompletedOnboarding(mockState)).toEqual(
      mockState.onboarding.completedOnboarding,
    );
  });
});
