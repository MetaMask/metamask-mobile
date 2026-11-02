import { selectGeolocationRefreshEnabled } from '.';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

const ENV_KEY = 'MM_GEOLOCATION_REFRESH_ENABLED';

describe('selectGeolocationRefreshEnabled', () => {
  const originalEnv = process.env[ENV_KEY];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
    delete process.env[ENV_KEY];
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = originalEnv;
    }
  });

  it('returns true when the remote flag is enabled', () => {
    const result = selectGeolocationRefreshEnabled.resultFunc({
      [FeatureFlagNames.geolocationRefreshOnNetworkChange]: {
        enabled: true,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(true);
  });

  it('returns false when the remote flag is disabled', () => {
    const result = selectGeolocationRefreshEnabled.resultFunc({
      [FeatureFlagNames.geolocationRefreshOnNetworkChange]: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the app is below the minimum version', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    const result = selectGeolocationRefreshEnabled.resultFunc({
      [FeatureFlagNames.geolocationRefreshOnNetworkChange]: {
        enabled: true,
        minimumVersion: '99.0.0',
      },
    });

    expect(result).toBe(false);
  });

  it('returns false when the remote flag is missing and no local override is set', () => {
    const result = selectGeolocationRefreshEnabled.resultFunc({});

    expect(result).toBe(false);
  });

  it('falls back to the local override when the remote flag is missing', () => {
    process.env[ENV_KEY] = 'true';

    const result = selectGeolocationRefreshEnabled.resultFunc({});

    expect(result).toBe(true);
  });

  it('falls back to the local override when the remote flag is invalid', () => {
    process.env[ENV_KEY] = 'true';

    const result = selectGeolocationRefreshEnabled.resultFunc({
      [FeatureFlagNames.geolocationRefreshOnNetworkChange]: 'invalid',
    });

    expect(result).toBe(true);
  });

  it('prefers a valid remote flag over the local override', () => {
    process.env[ENV_KEY] = 'true';

    const result = selectGeolocationRefreshEnabled.resultFunc({
      [FeatureFlagNames.geolocationRefreshOnNetworkChange]: {
        enabled: false,
        minimumVersion: '1.0.0',
      },
    });

    expect(result).toBe(false);
  });
});
