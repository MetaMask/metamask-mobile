import semver from 'semver';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;

/**
 * Extracts the base 3-part SemVer version (major.minor.patch) from the package.json version.
 * Strips any prerelease or build metadata suffixes
 *
 * @returns The base version string (e.g., '13.13.0' or '13.2.3'), or 'unknown' if parsing fails
 */
export const getBaseSemVerVersion = (): string => {
  const parsed = semver.parse(APP_VERSION);
  if (!parsed) {
    return 'unknown';
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
};
