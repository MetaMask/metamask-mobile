import semver from 'semver';
import packageJson from '../../package.json';
import { OTA_VERSION } from '../constants/ota';

const APP_VERSION = packageJson.version;

/**
 * Strict `X.Y.Z` (optionally `v`-prefixed). Rejects the `vX.XX.X` sentinel and
 * nightly counters such as `v0` / `v1`.
 */
const STRICT_SEMVER_REGEX =
  /^v?((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/u;

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

/**
 * Applies the OTA hotfix version on top of a native base version.
 *
 * OTA hotfixes only bump `OTA_VERSION` (e.g. `v8.18.1` on top of the 8.18.0
 * binary), so native and `package.json` versions do not reflect them. The
 * higher of the two versions wins, which also guards against a stale
 * `OTA_VERSION` left over on a newer native release. Non-semver `OTA_VERSION`
 * or base values are ignored.
 *
 * @param baseVersion - The native 3-part SemVer version (e.g., '8.18.0').
 * @returns The OTA version when it is higher, otherwise `baseVersion`.
 */
export const applyOtaVersion = (baseVersion: string): string => {
  const otaVersion = STRICT_SEMVER_REGEX.exec(OTA_VERSION)?.[1];

  if (!otaVersion || !semver.valid(baseVersion)) {
    return baseVersion;
  }

  return semver.gt(otaVersion, baseVersion) ? otaVersion : baseVersion;
};

/**
 * Returns the app version including any applied OTA hotfix.
 *
 * @returns The effective 3-part SemVer version (e.g., '8.18.1').
 */
export const getEffectiveAppVersion = (): string =>
  applyOtaVersion(getBaseSemVerVersion());
