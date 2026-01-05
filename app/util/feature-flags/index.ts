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
