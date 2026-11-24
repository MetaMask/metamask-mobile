import { BRAZE_EVENT_BLOCKLIST_FLAG_KEY, getBrazeBlockedEventNames } from '.';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.14.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('brazeEventBlocklist', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion.mockRestore();
  });

  it('exposes the LaunchDarkly flag key', () => {
    expect(BRAZE_EVENT_BLOCKLIST_FLAG_KEY).toBe('brazeEventBlocklist');
  });

  it('returns blocked event names when the flag is enabled', () => {
    const result = getBrazeBlockedEventNames({
      enabled: true,
      minimumVersion: '8.14.0',
      blockedEvents: ['App Opened', 'Token Detected'],
    });

    expect(result).toEqual(['App Opened', 'Token Detected']);
  });

  it('reads blocked event names from a progressive-rollout wrapper', () => {
    const result = getBrazeBlockedEventNames({
      value: {
        enabled: true,
        minimumVersion: '8.14.0',
        blockedEvents: ['App Opened'],
      },
    });

    expect(result).toEqual(['App Opened']);
  });

  it('returns an empty list when the flag is disabled', () => {
    const result = getBrazeBlockedEventNames({
      enabled: false,
      minimumVersion: '8.14.0',
      blockedEvents: ['App Opened'],
    });

    expect(result).toEqual([]);
  });

  it('returns an empty list when the minimum version is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    const result = getBrazeBlockedEventNames({
      enabled: true,
      minimumVersion: '99.0.0',
      blockedEvents: ['App Opened'],
    });

    expect(result).toEqual([]);
  });

  it('returns an empty list when the flag is missing', () => {
    expect(getBrazeBlockedEventNames(undefined)).toEqual([]);
  });

  it('returns an empty list when blockedEvents is not an array of strings', () => {
    expect(
      getBrazeBlockedEventNames({
        enabled: true,
        minimumVersion: '8.14.0',
        blockedEvents: ['App Opened', 1],
      }),
    ).toEqual([]);
    expect(
      getBrazeBlockedEventNames({
        enabled: true,
        minimumVersion: '8.14.0',
      }),
    ).toEqual([]);
  });
});
