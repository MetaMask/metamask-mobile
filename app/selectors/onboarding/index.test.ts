import {
  selectCompletedOnboarding,
  selectSeedlessOnboardingMigrationVersion,
} from '.';
import { SeedlessOnboardingMigrationVersion } from '../../actions/onboarding';
import { RootState } from '../../reducers';

describe('Onboarding selectors', () => {
  const mockState = {
    onboarding: {
      completedOnboarding: true,
      seedlessOnboardingMigrationVersion:
        SeedlessOnboardingMigrationVersion.DataType,
    },
  } as RootState;

  it('returns the correct value for selectCompletedOnboarding', () => {
    expect(selectCompletedOnboarding(mockState)).toEqual(
      mockState.onboarding.completedOnboarding,
    );
  });

  it('returns the correct value for selectSeedlessOnboardingMigrationVersion', () => {
    expect(selectSeedlessOnboardingMigrationVersion(mockState)).toEqual(
      SeedlessOnboardingMigrationVersion.DataType,
    );
  });
});
