import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';
import {
  gtVersion,
  hasProperty,
  isObject,
  isValidSemVerVersion,
  type SemVerVersion,
} from '@metamask/utils';
import { getBaseSemVerVersion } from '../version';

export enum FeatureFlagType {
  FeatureFlagBoolean = 'boolean',
  FeatureFlagString = 'string',
  FeatureFlagNumber = 'number',
  FeatureFlagArray = 'array',
  FeatureFlagObject = 'object',
  FeatureFlagBooleanWithMinimumVersion = 'boolean with minimumVersion',
  FeatureFlagBooleanNested = 'boolean nested',
  FeatureFlagAbTest = 'abTest',
}

export interface AbTestOption {
  name: string;
  value?: unknown;
}

export interface FeatureFlagInfo {
  key: string;
  value: unknown;
  originalValue: unknown;
  type: FeatureFlagType;
  isOverridden: boolean;
  /** Raw A/B arms for the build, present only for A/B flags. */
  abTestOptions?: AbTestOption[];
}

/**
 * Detects the A/B test group array shape, e.g. `[{ name, value, scope }, ...]`.
 * The remote feature flag controller resolves such a flag to a single group's
 * value, dropping the group name, so the resolved value alone no longer looks
 * like an A/B test. This checks the raw (pre resolution) value instead.
 *
 * @param value - The raw remote feature flag value.
 * @returns True when the value is a non empty array of named groups.
 */
export const isAbTestOptionsArray = (value: unknown): value is AbTestOption[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as { name?: unknown }).name === 'string',
  );

// Read once: the controller is constructed with this same value and it cannot change at runtime.
const CLIENT_VERSION = getBaseSemVerVersion();

const isVersionAtLeast = (
  currentVersion: SemVerVersion,
  requiredVersion: SemVerVersion,
) =>
  currentVersion === requiredVersion ||
  gtVersion(currentVersion, requiredVersion);

/**
 * Mirrors `getVersionData` from `@metamask/remote-feature-flag-controller`,
 * which the package does not export, so the override screen sees the same
 * `versions` entry the controller serves this build. Returns `undefined` when
 * the build is below every entry and non-versioned values unchanged.
 *
 * @param value - The raw remote feature flag value.
 * @returns The entry served to this build, or the value itself when not versioned.
 */
export const resolveVersionedFlagValue = (value: unknown): unknown => {
  if (!isObject(value) || !hasProperty(value, 'versions')) {
    return value;
  }
  const { versions } = value;
  if (!isObject(versions)) {
    return value;
  }
  const versionKeys = Object.keys(versions);
  if (!versionKeys.every(isValidSemVerVersion)) {
    return value;
  }
  if (!isValidSemVerVersion(CLIENT_VERSION)) {
    return undefined;
  }
  const matchedVersion = [...versionKeys]
    .sort((versionA, versionB) =>
      isVersionAtLeast(versionA, versionB) ? -1 : 1,
    )
    .find((version) => isVersionAtLeast(CLIENT_VERSION, version));
  return matchedVersion === undefined ? undefined : versions[matchedVersion];
};

/**
 * Gets the type of a feature flag value
 */
export const getFeatureFlagType = (value: unknown): FeatureFlagType => {
  if (value === null) {
    return FeatureFlagType.FeatureFlagObject;
  }
  if (typeof value === 'boolean') {
    return FeatureFlagType.FeatureFlagBoolean;
  } else if (typeof value === 'string') {
    return FeatureFlagType.FeatureFlagString;
  } else if (typeof value === 'number') {
    return FeatureFlagType.FeatureFlagNumber;
  } else if (Array.isArray(value)) {
    return FeatureFlagType.FeatureFlagArray;
  } else if (
    value &&
    typeof value === 'object' &&
    Object.hasOwnProperty.call(value, 'enabled') &&
    Object.hasOwnProperty.call(value, 'minimumVersion')
  ) {
    return FeatureFlagType.FeatureFlagBooleanWithMinimumVersion;
  } else if (
    typeof value === 'object' &&
    Object.keys(value as object).length === 2 &&
    Object.hasOwnProperty.call(value, 'name') &&
    Object.hasOwnProperty.call(value, 'value') &&
    typeof (value as { name: unknown }).name === 'string'
  ) {
    return FeatureFlagType.FeatureFlagAbTest;
  } else if (
    typeof value === 'object' &&
    typeof (value as { value: boolean })?.value === 'boolean'
  ) {
    return FeatureFlagType.FeatureFlagBooleanNested;
  } else if (typeof value === 'object') {
    return FeatureFlagType.FeatureFlagObject;
  }
  return FeatureFlagType.FeatureFlagString;
};

export const isMinimumRequiredVersionSupported = (
  minRequiredVersion: string,
) => {
  if (!minRequiredVersion) return false;
  try {
    const currentVersion = getVersion();
    return compareVersions.compare(currentVersion, minRequiredVersion, '>=');
  } catch {
    return false;
  }
};
