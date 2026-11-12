import { isCollectiblesBuildEnabled } from '../../../../constants/featureFlags';
import type { StateWithPartialEngine } from '../../../../selectors/featureFlagController/types';
import { selectCollectiblesEnabledFlag } from './featureFlags';

// The build flag is inlined by Babel, so it cannot be changed at runtime.
// Mock its reader, like the other build-time gates in the repository.
jest.mock('../../../../constants/featureFlags', () => ({
  ...jest.requireActual('../../../../constants/featureFlags'),
  isCollectiblesBuildEnabled: jest.fn(() => false),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

// `__esModule: true` keeps the export live so a test can activate the override.
jest.mock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    __esModule: true,
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

const remoteFeatureFlagControllerModule = jest.requireMock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller',
) as { isRemoteFeatureFlagOverrideActivated: boolean };

const createState = (
  remoteFeatureFlags: Record<string, unknown>,
  basicFunctionalityEnabled = true,
): StateWithPartialEngine =>
  ({
    settings: { basicFunctionalityEnabled },
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: { remoteFeatureFlags, cacheTimestamp: 0 },
      },
    },
  }) as unknown as StateWithPartialEngine;

describe('selectCollectiblesEnabledFlag', () => {
  const devGlobal = globalThis as unknown as { __DEV__: boolean };
  const originalDev = devGlobal.__DEV__;
  beforeEach(() => {
    devGlobal.__DEV__ = true;
    jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(false);
    remoteFeatureFlagControllerModule.isRemoteFeatureFlagOverrideActivated = false;
  });

  afterEach(() => {
    devGlobal.__DEV__ = originalDev;
    remoteFeatureFlagControllerModule.isRemoteFeatureFlagOverrideActivated = false;
  });

  it.each([true, false])(
    'returns the valid remote value %s in development even when the local flag is true',
    (remoteEnabled) => {
      jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(true);
      const state = createState({
        collectiblesEnabled: {
          enabled: remoteEnabled,
          minimumVersion: '1.0.0',
        },
      });

      const enabled = selectCollectiblesEnabledFlag(state);

      expect(enabled).toBe(remoteEnabled);
    },
  );

  it.each([true, false])(
    'returns the valid remote value %s outside development',
    (remoteEnabled) => {
      devGlobal.__DEV__ = false;
      jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(true);
      const state = createState({
        collectiblesEnabled: {
          enabled: remoteEnabled,
          minimumVersion: '1.0.0',
        },
      });

      const enabled = selectCollectiblesEnabledFlag(state);

      expect(enabled).toBe(remoteEnabled);
    },
  );

  it.each([
    { description: 'missing', remoteFeatureFlags: {} },
    {
      description: 'invalid',
      remoteFeatureFlags: { collectiblesEnabled: 'yes' },
    },
  ])(
    'falls back to the local flag in development when the remote flag is $description',
    ({ remoteFeatureFlags }) => {
      jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(true);
      const state = createState(remoteFeatureFlags);

      const enabled = selectCollectiblesEnabledFlag(state);

      expect(enabled).toBe(true);
    },
  );

  it('falls back to the local flag when the remote override is active', () => {
    remoteFeatureFlagControllerModule.isRemoteFeatureFlagOverrideActivated = true;
    jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(true);
    const state = createState({
      collectiblesEnabled: { enabled: false, minimumVersion: '1.0.0' },
    });

    const enabled = selectCollectiblesEnabledFlag(state);

    expect(enabled).toBe(true);
  });

  it('returns false when the remote override is active without the local flag', () => {
    remoteFeatureFlagControllerModule.isRemoteFeatureFlagOverrideActivated = true;
    const state = createState({
      collectiblesEnabled: { enabled: true, minimumVersion: '1.0.0' },
    });

    const enabled = selectCollectiblesEnabledFlag(state);

    expect(enabled).toBe(false);
  });

  it('ignores the local flag outside development when the remote flag is missing', () => {
    devGlobal.__DEV__ = false;
    jest.mocked(isCollectiblesBuildEnabled).mockReturnValue(true);
    const state = createState({});

    const enabled = selectCollectiblesEnabledFlag(state);

    expect(enabled).toBe(false);
  });

  it('returns false when the app version is below the minimum', () => {
    const state = createState({
      collectiblesEnabled: { enabled: true, minimumVersion: '99.0.0' },
    });

    const enabled = selectCollectiblesEnabledFlag(state);

    expect(enabled).toBe(false);
  });

  it('unwraps a progressive rollout flag', () => {
    const state = createState({
      collectiblesEnabled: {
        name: 'group',
        value: { enabled: true, minimumVersion: '1.0.0' },
      },
    });

    const enabled = selectCollectiblesEnabledFlag(state);

    expect(enabled).toBe(true);
  });

  it.each([
    { description: 'missing', remoteFeatureFlags: {} },
    {
      description: 'invalid',
      remoteFeatureFlags: { collectiblesEnabled: 'yes' },
    },
  ])(
    'returns false when the remote flag is $description without the local flag',
    ({ remoteFeatureFlags }) => {
      const state = createState(remoteFeatureFlags);

      const enabled = selectCollectiblesEnabledFlag(state);

      expect(enabled).toBe(false);
    },
  );

  it('ignores remote flags when basic functionality is off', () => {
    const state = createState(
      { collectiblesEnabled: { enabled: true, minimumVersion: '1.0.0' } },
      false,
    );

    const enabled = selectCollectiblesEnabledFlag(state);

    expect(enabled).toBe(false);
  });
});
