import {
  BFT_ENABLED_CHILDREN_LANDING_THRESHOLD,
  type BasicFunctionalityPreferenceState,
  getBasicFunctionalityConsolidationPlan,
  isBasicFunctionalitySocialLoginUser,
} from './getBasicFunctionalityConsolidationPlan';
import { BFT_CHILD_PREFERENCES } from '../../selectors/featureFlagController/basicFunctionalityConsolidation';

const createPreferences = (enabled: boolean) =>
  ({
    basicFunctionalityEnabled: enabled,
    ...Object.fromEntries(
      BFT_CHILD_PREFERENCES.map((preference) => [preference, enabled]),
    ),
  }) as BasicFunctionalityPreferenceState;

describe('getBasicFunctionalityConsolidationPlan', () => {
  it('silently preserves consistent all-on settings', () => {
    expect(
      getBasicFunctionalityConsolidationPlan(createPreferences(true), false),
    ).toStrictEqual({
      landingState: true,
      notification: null,
    });
  });

  it('silently preserves consistent all-off settings', () => {
    expect(
      getBasicFunctionalityConsolidationPlan(createPreferences(false), false),
    ).toStrictEqual({
      landingState: false,
      notification: null,
    });
  });

  it('schedules a toast and enables mixed settings above the threshold', () => {
    const preferences = createPreferences(false);
    BFT_CHILD_PREFERENCES.slice(
      0,
      BFT_ENABLED_CHILDREN_LANDING_THRESHOLD + 1,
    ).forEach((preference) => {
      preferences[preference] = true;
    });

    expect(
      getBasicFunctionalityConsolidationPlan(preferences, false),
    ).toStrictEqual({
      landingState: true,
      notification: 'toast',
    });
  });

  it('schedules a toast and disables mixed settings at the threshold', () => {
    const preferences = createPreferences(false);
    BFT_CHILD_PREFERENCES.slice(
      0,
      BFT_ENABLED_CHILDREN_LANDING_THRESHOLD,
    ).forEach((preference) => {
      preferences[preference] = true;
    });

    expect(
      getBasicFunctionalityConsolidationPlan(preferences, false),
    ).toStrictEqual({
      landingState: false,
      notification: 'toast',
    });
  });

  it('forces social-login users on and schedules a bottom sheet', () => {
    expect(
      getBasicFunctionalityConsolidationPlan(createPreferences(false), true),
    ).toStrictEqual({
      landingState: true,
      notification: 'bottom-sheet',
    });
  });
});

describe('isBasicFunctionalitySocialLoginUser', () => {
  it.each([
    { authConnection: 'google' },
    { hasSeedlessVault: true },
    { accountType: 'metamask_apple' },
    { accountType: 'imported_telegram' },
  ])('detects a social-login signal: %o', (signals) => {
    expect(isBasicFunctionalitySocialLoginUser(signals)).toBe(true);
  });

  it('returns false for an SRP wallet', () => {
    expect(
      isBasicFunctionalitySocialLoginUser({
        accountType: 'metamask',
        hasSeedlessVault: false,
      }),
    ).toBe(false);
  });
});
