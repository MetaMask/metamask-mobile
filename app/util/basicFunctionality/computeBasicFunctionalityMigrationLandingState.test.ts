import { BFT_CHILD_PREFERENCES } from './bftChildPreferences';
import { computeBasicFunctionalityMigrationLandingState } from './computeBasicFunctionalityMigrationLandingState';

function buildChildren(enabledCount: number) {
  return Object.fromEntries(
    BFT_CHILD_PREFERENCES.map((preference, index) => [
      preference,
      index < enabledCount,
    ]),
  );
}

describe('computeBasicFunctionalityMigrationLandingState', () => {
  it('lands ON silently when BF is ON and all children are ON', () => {
    const result = computeBasicFunctionalityMigrationLandingState({
      basicFunctionalityEnabled: true,
      childPreferenceValues: buildChildren(BFT_CHILD_PREFERENCES.length),
      isSocialLogin: false,
    });

    expect(result).toEqual({
      landingState: true,
      enabledChildren: BFT_CHILD_PREFERENCES.length,
      isConsistent: true,
      shouldNotify: false,
    });
  });

  it('lands OFF silently when BF is OFF and all children are OFF', () => {
    const result = computeBasicFunctionalityMigrationLandingState({
      basicFunctionalityEnabled: false,
      childPreferenceValues: buildChildren(0),
      isSocialLogin: false,
    });

    expect(result).toEqual({
      landingState: false,
      enabledChildren: 0,
      isConsistent: true,
      shouldNotify: false,
    });
  });

  it('lands ON with notification when BF is ON and children are mixed', () => {
    const result = computeBasicFunctionalityMigrationLandingState({
      basicFunctionalityEnabled: true,
      childPreferenceValues: buildChildren(3),
      isSocialLogin: false,
    });

    expect(result).toEqual({
      landingState: true,
      enabledChildren: 3,
      isConsistent: false,
      shouldNotify: true,
    });
  });

  it('lands OFF with notification when BF is OFF and 1-9 children are ON', () => {
    const result = computeBasicFunctionalityMigrationLandingState({
      basicFunctionalityEnabled: false,
      childPreferenceValues: buildChildren(3),
      isSocialLogin: false,
    });

    expect(result).toEqual({
      landingState: false,
      enabledChildren: 3,
      isConsistent: false,
      shouldNotify: true,
    });
  });

  it('lands ON for social login users with BF OFF and notifies', () => {
    const result = computeBasicFunctionalityMigrationLandingState({
      basicFunctionalityEnabled: false,
      childPreferenceValues: buildChildren(0),
      isSocialLogin: true,
    });

    expect(result).toEqual({
      landingState: true,
      enabledChildren: 0,
      isConsistent: true,
      shouldNotify: true,
    });
  });
});
