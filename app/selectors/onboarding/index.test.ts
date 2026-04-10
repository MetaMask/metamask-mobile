import {
  selectCompletedOnboarding,
  selectOnboardingAccountType,
  selectPendingSocialLoginMarketingConsentBackfill,
} from '.';
import { RootState } from '../../reducers';
import { AccountType } from '../../constants/onboarding';

describe('Onboarding selectors', () => {
  const mockState = {
    onboarding: {
      completedOnboarding: true,
      accountType: AccountType.MetamaskGoogle,
    },
  } as RootState;

  it('returns the correct value for selectCompletedOnboarding ', () => {
    expect(selectCompletedOnboarding(mockState)).toEqual(
      mockState.onboarding.completedOnboarding,
    );
  });

  it('returns the correct value for selectOnboardingAccountType', () => {
    expect(selectOnboardingAccountType(mockState)).toEqual(
      AccountType.MetamaskGoogle,
    );
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

  it('returns null for selectPendingSocialLoginMarketingConsentBackfill when not set', () => {
    const state = {
      onboarding: {
        completedOnboarding: false,
      },
    } as RootState;
    expect(selectPendingSocialLoginMarketingConsentBackfill(state)).toBeNull();
  });

  it('returns the pending auth connection for selectPendingSocialLoginMarketingConsentBackfill', () => {
    const state = {
      onboarding: {
        completedOnboarding: true,
        pendingSocialLoginMarketingConsentBackfill: 'google',
      },
    } as RootState;
    expect(selectPendingSocialLoginMarketingConsentBackfill(state)).toBe(
      'google',
    );
  });
});
