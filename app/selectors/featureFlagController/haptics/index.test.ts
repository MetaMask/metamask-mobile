import { selectHapticsKillSwitch } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectHapticsKillSwitch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('returns true when remote flag is valid and enabled', () => {
    const result = selectHapticsKillSwitch.resultFunc({
      [FeatureFlagNames.hapticsKillSwitch]: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when remote flag is valid but disabled', () => {
    const result = selectHapticsKillSwitch.resultFunc({
      [FeatureFlagNames.hapticsKillSwitch]: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when version check fails', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    const result = selectHapticsKillSwitch.resultFunc({
      [FeatureFlagNames.hapticsKillSwitch]: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote flag is invalid', () => {
    const result = selectHapticsKillSwitch.resultFunc({
      [FeatureFlagNames.hapticsKillSwitch]: {
        enabled: 'invalid',
        minimumVersion: 123,
      } as unknown as { enabled: boolean; minimumVersion: string },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote feature flags are empty', () => {
    const result = selectHapticsKillSwitch.resultFunc({});

    expect(result).toBe(false);
  });

  it('returns false when hapticsKillSwitch property is missing', () => {
    const result = selectHapticsKillSwitch.resultFunc({
      someOtherFlag: true,
    });

    expect(result).toBe(false);
  });

  it('returns true when boolean local override is true', () => {
    const result = selectHapticsKillSwitch.resultFunc({
      [FeatureFlagNames.hapticsKillSwitch]: true,
    });

    expect(result).toBe(true);
  });

  it('returns false when boolean local override is false', () => {
    const result = selectHapticsKillSwitch.resultFunc({
      [FeatureFlagNames.hapticsKillSwitch]: false,
    });

    expect(result).toBe(false);
  });
});
