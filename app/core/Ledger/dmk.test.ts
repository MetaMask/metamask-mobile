import { isDmkEnabled } from './dmk';
import { FeatureFlagNames } from '../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../util/remoteFeatureFlag';

jest.mock('../../util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

const mockVersionGated = validatedVersionGatedFeatureFlag as jest.Mock;

describe('isDmkEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVersionGated.mockReturnValue(true);
  });

  it('returns true for an enabled version-gated flag', () => {
    expect(
      isDmkEnabled({
        [FeatureFlagNames.ledgerDmk]: {
          enabled: true,
          minimumVersion: '7.0.0',
        },
      }),
    ).toBe(true);
  });

  it('returns false when the flag is missing (default)', () => {
    expect(isDmkEnabled({})).toBe(false);
  });

  it('returns false when flags are omitted or null', () => {
    expect(isDmkEnabled()).toBe(false);
    expect(isDmkEnabled(null)).toBe(false);
    expect(isDmkEnabled(undefined)).toBe(false);
  });

  it('uses a boolean flag directly, bypassing version-gating', () => {
    expect(isDmkEnabled({ [FeatureFlagNames.ledgerDmk]: true })).toBe(true);
    expect(isDmkEnabled({ [FeatureFlagNames.ledgerDmk]: false })).toBe(false);
    expect(mockVersionGated).not.toHaveBeenCalled();
  });

  it('returns false when version-gated evaluation yields null', () => {
    mockVersionGated.mockReturnValue(null);

    expect(
      isDmkEnabled({
        [FeatureFlagNames.ledgerDmk]: {
          enabled: true,
          minimumVersion: '7.0.0',
        },
      }),
    ).toBe(false);
  });

  // LEDGER_FORCE_DMK is inlined by babel-plugin-transform-inline-environment-variables
  // at compile time, so its true branch cannot be exercised via runtime env mutation.
});
