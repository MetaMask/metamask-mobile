import semver from 'semver';
import { getBaseSemVerVersion } from './version';

jest.mock('semver');
jest.mock('../../package.json', () => ({
  version: '12.5.0',
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
