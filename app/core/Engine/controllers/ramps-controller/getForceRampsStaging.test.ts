import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { FeatureFlagNames } from '../../../../constants/featureFlags';
import { getForceRampsStaging } from './getForceRampsStaging';

const FLAG_KEY = FeatureFlagNames.forceRampsStagingEnvironment;

function buildMockControllerState({
  remoteFeatureFlags = {},
  localOverrides = {},
}: {
  remoteFeatureFlags?: Record<string, unknown>;
  localOverrides?: Record<string, unknown>;
} = {}): RemoteFeatureFlagControllerState {
  return {
    remoteFeatureFlags,
    localOverrides,
    cacheTimestamp: 0,
    rawRemoteFeatureFlags: {},
  } as unknown as RemoteFeatureFlagControllerState;
}

describe('getForceRampsStaging', () => {
  it('returns false when controller state is undefined', () => {
    expect(getForceRampsStaging(undefined)).toBe(false);
  });

  it('returns false when flag is absent', () => {
    expect(getForceRampsStaging(buildMockControllerState())).toBe(false);
  });

  it('returns false when flag is explicitly false in remoteFeatureFlags', () => {
    const state = buildMockControllerState({
      remoteFeatureFlags: { [FLAG_KEY]: false },
    });

    expect(getForceRampsStaging(state)).toBe(false);
  });

  it('returns true when flag is true in remoteFeatureFlags', () => {
    const state = buildMockControllerState({
      remoteFeatureFlags: { [FLAG_KEY]: true },
    });

    expect(getForceRampsStaging(state)).toBe(true);
  });

  it('returns true when localOverrides sets the flag to true', () => {
    const state = buildMockControllerState({
      remoteFeatureFlags: { [FLAG_KEY]: false },
      localOverrides: { [FLAG_KEY]: true },
    });

    expect(getForceRampsStaging(state)).toBe(true);
  });

  it('returns false when localOverrides overrides the flag to false', () => {
    const state = buildMockControllerState({
      remoteFeatureFlags: { [FLAG_KEY]: true },
      localOverrides: { [FLAG_KEY]: false },
    });

    expect(getForceRampsStaging(state)).toBe(false);
  });

  it('returns false when flag value is a non-boolean truthy value', () => {
    const state = buildMockControllerState({
      remoteFeatureFlags: { [FLAG_KEY]: 'true' },
    });

    expect(getForceRampsStaging(state)).toBe(false);
  });
});
