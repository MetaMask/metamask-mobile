import semver from 'semver';
import { getBaseSemVerVersion, getEffectiveAppVersion } from './version';

jest.mock('semver', () => {
  const actual = jest.requireActual('semver');
  return { ...actual, parse: jest.fn(actual.parse) };
});
jest.mock('../../package.json', () => ({
  version: '12.5.0',
}));

const mockOta = { OTA_VERSION: 'vX.XX.X' };
jest.mock('../constants/ota', () => ({
  get OTA_VERSION() {
    return mockOta.OTA_VERSION;
  },
}));

describe('getBaseSemVerVersion', () => {
  const semverParseMock = semver.parse as jest.MockedFunction<
    typeof semver.parse
  >;

  it('returns base version from package.json version', () => {
    semverParseMock.mockReturnValue({
      major: 12,
      minor: 5,
      patch: 0,
    } as semver.SemVer);

    expect(getBaseSemVerVersion()).toBe('12.5.0');
    expect(semverParseMock).toHaveBeenCalledWith('12.5.0');
  });

  it('strips prerelease tag when parsing version', () => {
    semverParseMock.mockReturnValue({
      major: 13,
      minor: 13,
      patch: 0,
      prerelease: ['experimental', 0],
    } as unknown as semver.SemVer);

    expect(getBaseSemVerVersion()).toBe('13.13.0');
  });

  it('strips build metadata when parsing version', () => {
    semverParseMock.mockReturnValue({
      major: 1,
      minor: 0,
      patch: 0,
      build: ['build', '123'],
    } as unknown as semver.SemVer);

    expect(getBaseSemVerVersion()).toBe('1.0.0');
  });

  it('returns unknown when semver.parse returns null', () => {
    semverParseMock.mockReturnValue(null);

    expect(getBaseSemVerVersion()).toBe('unknown');
  });
});

describe('getEffectiveAppVersion', () => {
  const semverParseMock = semver.parse as jest.MockedFunction<
    typeof semver.parse
  >;

  beforeEach(() => {
    semverParseMock.mockImplementation(jest.requireActual('semver').parse);
    mockOta.OTA_VERSION = 'vX.XX.X';
  });

  it('returns the package.json version when OTA_VERSION is the unset sentinel', () => {
    expect(getEffectiveAppVersion()).toBe('12.5.0');
  });

  it.each(['v0', 'v1', 'v12', '', 'v12.5', 'v12.05.1', 'v12.5.1-beta'])(
    'ignores non-semver OTA_VERSION %p',
    (otaVersion) => {
      mockOta.OTA_VERSION = otaVersion;

      expect(getEffectiveAppVersion()).toBe('12.5.0');
    },
  );

  it('returns the OTA version when it is higher than the package.json version', () => {
    mockOta.OTA_VERSION = 'v12.5.1';

    expect(getEffectiveAppVersion()).toBe('12.5.1');
  });

  it('accepts an OTA_VERSION without the v prefix', () => {
    mockOta.OTA_VERSION = '12.5.2';

    expect(getEffectiveAppVersion()).toBe('12.5.2');
  });

  it('returns the package.json version when OTA_VERSION is stale (lower)', () => {
    mockOta.OTA_VERSION = 'v12.4.3';

    expect(getEffectiveAppVersion()).toBe('12.5.0');
  });

  it('returns the package.json version when OTA_VERSION is equal', () => {
    mockOta.OTA_VERSION = 'v12.5.0';

    expect(getEffectiveAppVersion()).toBe('12.5.0');
  });

  it('returns the OTA version when the package.json version cannot be parsed', () => {
    semverParseMock.mockReturnValue(null);
    mockOta.OTA_VERSION = 'v12.5.1';

    expect(getEffectiveAppVersion()).toBe('12.5.1');
  });
});
