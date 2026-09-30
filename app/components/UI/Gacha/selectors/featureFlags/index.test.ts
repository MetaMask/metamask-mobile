import type { StateWithPartialEngine } from '../../../../../selectors/featureFlagController/types';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../../util/remoteFeatureFlag';
import { selectGachaEnabledFlag } from '.';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock(
  '../../../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

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

describe('selectGachaEnabledFlag', () => {
  let hasMinimumRequiredVersion: jest.SpyInstance;
  const devGlobal = globalThis as unknown as { __DEV__: boolean };
  const originalDev = devGlobal.__DEV__;
  const originalGachaEnabled = process.env.MM_GACHA_ENABLED;

  beforeEach(() => {
    devGlobal.__DEV__ = true;
    delete process.env.MM_GACHA_ENABLED;
    hasMinimumRequiredVersion = jest
      .spyOn(remoteFeatureFlagModule, 'hasMinimumRequiredVersion')
      .mockReturnValue(true);
  });

  afterEach(() => {
    hasMinimumRequiredVersion.mockRestore();
    devGlobal.__DEV__ = originalDev;
    if (originalGachaEnabled === undefined) {
      delete process.env.MM_GACHA_ENABLED;
    } else {
      process.env.MM_GACHA_ENABLED = originalGachaEnabled;
    }
  });

  it('forces Gacha on in development when the remote flag is disabled', () => {
    process.env.MM_GACHA_ENABLED = 'true';
    const state = createState({
      gachaEnabled: { enabled: false, minimumVersion: '1.0.0' },
    });

    const enabled = selectGachaEnabledFlag(state);

    expect(enabled).toBe(true);
  });

  it('forces Gacha on in development when the remote flag is missing', () => {
    process.env.MM_GACHA_ENABLED = 'true';
    const state = createState({});

    const enabled = selectGachaEnabledFlag(state);

    expect(enabled).toBe(true);
  });

  it.each([true, false])(
    'preserves remote enabled=%s when the local flag is false',
    (remoteEnabled) => {
      process.env.MM_GACHA_ENABLED = 'false';
      const state = createState({
        gachaEnabled: { enabled: remoteEnabled, minimumVersion: '1.0.0' },
      });

      const enabled = selectGachaEnabledFlag(state);

      expect(enabled).toBe(remoteEnabled);
    },
  );

  it.each([true, false])(
    'preserves remote enabled=%s outside development even when the local flag is true',
    (remoteEnabled) => {
      devGlobal.__DEV__ = false;
      process.env.MM_GACHA_ENABLED = 'true';
      const state = createState({
        gachaEnabled: { enabled: remoteEnabled, minimumVersion: '1.0.0' },
      });

      const enabled = selectGachaEnabledFlag(state);

      expect(enabled).toBe(remoteEnabled);
    },
  );

  it('returns true when the remote flag is enabled', () => {
    const state = createState({
      gachaEnabled: { enabled: true, minimumVersion: '1.0.0' },
    });

    expect(selectGachaEnabledFlag(state)).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const state = createState({
      gachaEnabled: { enabled: false, minimumVersion: '1.0.0' },
    });

    expect(selectGachaEnabledFlag(state)).toBe(false);
  });

  it('returns false when the app version is below the minimum', () => {
    hasMinimumRequiredVersion.mockReturnValue(false);
    const state = createState({
      gachaEnabled: { enabled: true, minimumVersion: '99.0.0' },
    });

    expect(selectGachaEnabledFlag(state)).toBe(false);
  });

  it('unwraps a progressive rollout flag', () => {
    const state = createState({
      gachaEnabled: {
        name: 'group',
        value: { enabled: true, minimumVersion: '1.0.0' },
      },
    });

    expect(selectGachaEnabledFlag(state)).toBe(true);
  });

  it('returns false when the remote flag is missing', () => {
    const state = createState({});

    expect(selectGachaEnabledFlag(state)).toBe(false);
  });

  it('returns false when the remote flag is invalid', () => {
    const state = createState({ gachaEnabled: 'yes' });

    expect(selectGachaEnabledFlag(state)).toBe(false);
  });

  it('ignores remote flags when basic functionality is off', () => {
    const state = createState(
      { gachaEnabled: { enabled: true, minimumVersion: '1.0.0' } },
      false,
    );

    expect(selectGachaEnabledFlag(state)).toBe(false);
  });
});
