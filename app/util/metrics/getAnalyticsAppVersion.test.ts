import getAnalyticsAppVersion, {
  formatAnalyticsAppVersion,
} from './getAnalyticsAppVersion';
import { getVersion } from 'react-native-device-info';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

const mockGetVersion = getVersion as jest.MockedFunction<typeof getVersion>;

describe('formatAnalyticsAppVersion', () => {
  const baseVersion = '8.6.0';

  it('returns unsuffixed version for production', () => {
    const result = formatAnalyticsAppVersion(baseVersion, 'production');

    expect(result).toBe('8.6.0');
  });

  it('returns unsuffixed version when environment is undefined', () => {
    const result = formatAnalyticsAppVersion(baseVersion, undefined);

    expect(result).toBe('8.6.0');
  });

  it('returns unsuffixed version when environment is empty', () => {
    const result = formatAnalyticsAppVersion(baseVersion, '  ');

    expect(result).toBe('8.6.0');
  });

  it('appends release-candidate for rc', () => {
    const result = formatAnalyticsAppVersion(baseVersion, 'rc');

    expect(result).toBe('8.6.0-release-candidate');
  });

  it('appends experimental for exp', () => {
    const result = formatAnalyticsAppVersion(baseVersion, 'exp');

    expect(result).toBe('8.6.0-experimental');
  });

  it('appends development for dev', () => {
    const result = formatAnalyticsAppVersion(baseVersion, 'dev');

    expect(result).toBe('8.6.0-development');
  });

  it('appends environment name for other non-prod environments', () => {
    expect(formatAnalyticsAppVersion(baseVersion, 'beta')).toBe('8.6.0-beta');
    expect(formatAnalyticsAppVersion(baseVersion, 'test')).toBe('8.6.0-test');
    expect(formatAnalyticsAppVersion(baseVersion, 'e2e')).toBe('8.6.0-e2e');
  });

  it('keeps the raw environment code and appends nightly for rc', () => {
    const result = formatAnalyticsAppVersion(baseVersion, 'rc', 'nightly');

    expect(result).toBe('8.6.0-rc-nightly');
  });

  it('keeps the raw environment code and appends nightly for exp', () => {
    const result = formatAnalyticsAppVersion(baseVersion, 'exp', 'nightly');

    expect(result).toBe('8.6.0-exp-nightly');
  });

  it('appends only nightly for production', () => {
    const result = formatAnalyticsAppVersion(
      baseVersion,
      'production',
      'nightly',
    );

    expect(result).toBe('8.6.0-nightly');
  });

  // Runway and every other caller omit build attribution, so the CI env var is
  // either an empty string or absent. Both must keep the friendly suffixes.
  it('keeps friendly suffixes when build attribution is omitted or empty', () => {
    expect(formatAnalyticsAppVersion(baseVersion, 'rc')).toBe(
      '8.6.0-release-candidate',
    );
    expect(formatAnalyticsAppVersion(baseVersion, 'rc', '')).toBe(
      '8.6.0-release-candidate',
    );
    expect(formatAnalyticsAppVersion(baseVersion, 'exp')).toBe(
      '8.6.0-experimental',
    );
    expect(formatAnalyticsAppVersion(baseVersion, 'exp', '')).toBe(
      '8.6.0-experimental',
    );
    expect(formatAnalyticsAppVersion(baseVersion, 'dev', '')).toBe(
      '8.6.0-development',
    );
    expect(formatAnalyticsAppVersion(baseVersion, 'beta', '')).toBe(
      '8.6.0-beta',
    );
  });

  it('keeps friendly suffixes for unrecognized build attribution', () => {
    const result = formatAnalyticsAppVersion(baseVersion, 'rc', 'runway');

    expect(result).toBe('8.6.0-release-candidate');
  });
});

describe('getAnalyticsAppVersion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // METAMASK_ENVIRONMENT and METAMASK_BUILD_ATTRIBUTION are inlined by babel at
  // transform time, so runtime mutation is ignored here. Env→suffix mapping and
  // nightly handling are covered by formatAnalyticsAppVersion tests above.
  it('formats native getVersion with METAMASK_ENVIRONMENT and METAMASK_BUILD_ATTRIBUTION', () => {
    mockGetVersion.mockReturnValue('8.6.0');

    const result = getAnalyticsAppVersion();

    expect(result).toBe(
      formatAnalyticsAppVersion(
        '8.6.0',
        process.env.METAMASK_ENVIRONMENT,
        process.env.METAMASK_BUILD_ATTRIBUTION,
      ),
    );
    expect(mockGetVersion).toHaveBeenCalledTimes(1);
  });
});
