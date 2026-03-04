import { selectCompletedOnboarding, selectOnboardingAccountType } from '.';
import { RootState } from '../../reducers';

describe('Onboarding selectors', () => {
  const mockState = {
    onboarding: {
      completedOnboarding: true,
      accountType: 'metamask_google',
    },
  } as RootState;

  it('returns the correct value for selectCompletedOnboarding ', () => {
    expect(selectCompletedOnboarding(mockState)).toEqual(
      mockState.onboarding.completedOnboarding,
    );
  });

  it('returns the correct value for selectOnboardingAccountType', () => {
    expect(selectOnboardingAccountType(mockState)).toEqual('metamask_google');
  });

  it('returns undefined for selectOnboardingAccountType when not set', () => {
    const stateWithoutAccountType = {
      onboarding: {
        completedOnboarding: false,
      },
    } as RootState;
    expect(
      selectOnboardingAccountType(stateWithoutAccountType),
    ).toBeUndefined();
  });
});
