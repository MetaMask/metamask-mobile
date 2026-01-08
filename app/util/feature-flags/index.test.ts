import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';

import { getFeatureFlagType, isMinimumRequiredVersionSupported } from './index';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

jest.mock('compare-versions', () => ({
  compare: jest.fn(),
}));

describe('Feature Flags Utility Functions', () => {
  let mockedGetVersion: jest.MockedFunction<typeof getVersion>;
  let mockedCompareVersions: jest.MockedFunction<
    typeof compareVersions.compare
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetVersion = jest.mocked(getVersion);
    mockedCompareVersions = jest.mocked(compareVersions.compare);
  });

  describe('getFeatureFlagType', () => {
    it('returns "boolean" for boolean values', () => {
      const result = getFeatureFlagType(true);

      expect(result).toBe('boolean');
    });

    it('returns "boolean" for false boolean values', () => {
      const result = getFeatureFlagType(false);

      expect(result).toBe('boolean');
    });

    it('returns "string" for string values', () => {
      const result = getFeatureFlagType('test string');

      expect(result).toBe('string');
    });

    it('returns "string" for empty string values', () => {
      const result = getFeatureFlagType('');

      expect(result).toBe('string');
    });

    it('returns "number" for number values', () => {
      const result = getFeatureFlagType(42);

      expect(result).toBe('number');
    });

    it('returns "number" for zero number values', () => {
      const result = getFeatureFlagType(0);

      expect(result).toBe('number');
    });

    it('returns "number" for negative number values', () => {
      const result = getFeatureFlagType(-5);

      expect(result).toBe('number');
    });

    it('returns "number" for decimal number values', () => {
      const result = getFeatureFlagType(3.14);

      expect(result).toBe('number');
    });

    it('returns "array" for array values', () => {
      const result = getFeatureFlagType(['item1', 'item2']);

      expect(result).toBe('array');
    });

    it('returns "array" for empty array values', () => {
      const result = getFeatureFlagType([]);

      expect(result).toBe('array');
    });

    it('returns "boolean with minimumVersion" for objects with enabled boolean and minimumVersion string', () => {
      const flagValue = {
        enabled: true,
        minimumVersion: '1.0.0',
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('boolean with minimumVersion');
    });

    it('returns "boolean with minimumVersion" for objects with enabled false and minimumVersion string', () => {
      const flagValue = {
        enabled: false,
        minimumVersion: '2.0.0',
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('boolean with minimumVersion');
    });

    it('returns "boolean nested" for objects with boolean value property', () => {
      const flagValue = {
        value: true,
        someOtherProp: 'test',
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('boolean nested');
    });

    it('returns "boolean nested" for objects with false boolean value property', () => {
      const flagValue = {
        value: false,
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('boolean nested');
    });

    it('returns "object" for regular object values', () => {
      const flagValue = {
        key1: 'value1',
        key2: 42,
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('object');
    });

    it('returns "string" for undefined values', () => {
      const result = getFeatureFlagType(undefined);

      expect(result).toBe('string');
    });

    it('returns "object" for objects with value property that is not boolean', () => {
      const flagValue = {
        value: 'not boolean',
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('object');
    });

    it('returns "object" for empty objects', () => {
      const result = getFeatureFlagType({});

      expect(result).toBe('object');
    });

    it('returns "abTest" for objects with exactly name (string) and value properties', () => {
      const flagValue = {
        name: 'control',
        value: { variant: 'A' },
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('abTest');
    });

    it('returns "abTest" for A/B test with primitive value', () => {
      const flagValue = {
        name: 'treatment',
        value: true,
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('abTest');
    });

    it('returns "object" for objects with name and value plus additional properties', () => {
      const flagValue = {
        name: 'config',
        value: 'foo',
        other: 'data',
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('object');
    });

    it('returns "object" for objects with name and value where name is not a string', () => {
      const flagValue = {
        name: 123,
        value: 'test',
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('object');
    });

    it('returns "boolean nested" for objects with name and boolean value (name is not a string)', () => {
      const flagValue = {
        name: { nested: 'object' },
        value: true,
      };

      const result = getFeatureFlagType(flagValue);

      expect(result).toBe('boolean nested');
    });
  });

  describe('isMinimumRequiredVersionSupported', () => {
    beforeEach(() => {
      mockedGetVersion.mockReturnValue('1.5.0');
      mockedCompareVersions.mockReturnValue(true);
    });

    it('returns true when current version meets minimum requirement', () => {
      mockedCompareVersions.mockReturnValue(true);

      const result = isMinimumRequiredVersionSupported('1.0.0');

      expect(result).toBe(true);
      expect(mockedGetVersion).toHaveBeenCalledTimes(1);
      expect(mockedCompareVersions).toHaveBeenCalledWith(
        '1.5.0',
        '1.0.0',
        '>=',
      );
    });

    it('returns true when current version equals minimum requirement', () => {
      mockedCompareVersions.mockReturnValue(true);

      const result = isMinimumRequiredVersionSupported('1.5.0');

      expect(result).toBe(true);
      expect(mockedGetVersion).toHaveBeenCalledTimes(1);
      expect(mockedCompareVersions).toHaveBeenCalledWith(
        '1.5.0',
        '1.5.0',
        '>=',
      );
    });

    it('returns false when current version is below minimum requirement', () => {
      mockedCompareVersions.mockReturnValue(false);

      const result = isMinimumRequiredVersionSupported('2.0.0');

      expect(result).toBe(false);
      expect(mockedGetVersion).toHaveBeenCalledTimes(1);
      expect(mockedCompareVersions).toHaveBeenCalledWith(
        '1.5.0',
        '2.0.0',
        '>=',
      );
    });

    it('returns false when minimum required version is empty string', () => {
      const result = isMinimumRequiredVersionSupported('');

      expect(result).toBe(false);
      expect(mockedGetVersion).not.toHaveBeenCalled();
      expect(mockedCompareVersions).not.toHaveBeenCalled();
    });

    it('returns false when getVersion throws an error', () => {
      mockedGetVersion.mockImplementation(() => {
        throw new Error('Device info error');
      });

      const result = isMinimumRequiredVersionSupported('1.0.0');

      expect(result).toBe(false);
      expect(mockedGetVersion).toHaveBeenCalledTimes(1);
      expect(mockedCompareVersions).not.toHaveBeenCalled();
    });

    it('returns false when compareVersions throws an error', () => {
      mockedCompareVersions.mockImplementation(() => {
        throw new Error('Version comparison error');
      });

      const result = isMinimumRequiredVersionSupported('1.0.0');

      expect(result).toBe(false);
      expect(mockedGetVersion).toHaveBeenCalledTimes(1);
      expect(mockedCompareVersions).toHaveBeenCalledWith(
        '1.5.0',
        '1.0.0',
        '>=',
      );
    });

    it('returns false when any exception occurs during execution', () => {
      mockedGetVersion.mockReturnValue('1.5.0');
      mockedCompareVersions.mockImplementation(() => {
        throw new TypeError('Unexpected error');
      });

      const result = isMinimumRequiredVersionSupported('1.0.0');

      expect(result).toBe(false);
    });

    it('handles complex version numbers correctly', () => {
      mockedGetVersion.mockReturnValue('1.2.3-beta.4');
      mockedCompareVersions.mockReturnValue(true);

      const result = isMinimumRequiredVersionSupported('1.2.3-beta.3');

      expect(result).toBe(true);
      expect(mockedCompareVersions).toHaveBeenCalledWith(
        '1.2.3-beta.4',
        '1.2.3-beta.3',
        '>=',
      );
    });

    it('handles semantic versioning with build metadata', () => {
      mockedGetVersion.mockReturnValue('2.1.0+build.1');
      mockedCompareVersions.mockReturnValue(true);

      const result = isMinimumRequiredVersionSupported('2.0.0');

      expect(result).toBe(true);
      expect(mockedCompareVersions).toHaveBeenCalledWith(
        '2.1.0+build.1',
        '2.0.0',
        '>=',
      );
    });

    it('returns false when getVersion returns empty string', () => {
      mockedGetVersion.mockReturnValue('');
      mockedCompareVersions.mockReturnValue(false);

      const result = isMinimumRequiredVersionSupported('1.0.0');

      expect(result).toBe(false);
    });

    it('returns false when getVersion returns invalid version format', () => {
      mockedGetVersion.mockReturnValue('invalid.version');
      mockedCompareVersions.mockImplementation(() => {
        throw new Error('Invalid version format');
      });

      const result = isMinimumRequiredVersionSupported('1.0.0');

      expect(result).toBe(false);
    });
  });
});
