import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';

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

export interface FeatureFlagInfo {
  key: string;
  value: unknown;
  originalValue: unknown;
  type: FeatureFlagType;
  isOverridden: boolean;
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
export const isAbTestOptionsArray = (
  value: unknown,
): value is { name: string; value?: unknown }[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as { name?: unknown }).name === 'string',
  );

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
