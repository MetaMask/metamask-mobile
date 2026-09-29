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

  beforeEach(() => {
    hasMinimumRequiredVersion = jest
      .spyOn(remoteFeatureFlagModule, 'hasMinimumRequiredVersion')
      .mockReturnValue(true);
  });

  afterEach(() => {
    hasMinimumRequiredVersion.mockRestore();
  });

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
