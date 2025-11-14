import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';

import {
  getFeatureFlagType,
  getFeatureFlagDescription,
  isMinimumRequiredVersionSupported,
} from './index';

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
  });

  describe('getFeatureFlagDescription', () => {
    it('returns correct description for confirmation_redesign', () => {
      const result = getFeatureFlagDescription('confirmation_redesign');

      expect(result).toBe('Controls redesigned confirmation flows');
    });

    it('returns correct description for sendRedesign', () => {
      const result = getFeatureFlagDescription('sendRedesign');

      expect(result).toBe('Controls redesigned send flow');
    });

    it('returns correct description for bridgeConfigV2', () => {
      const result = getFeatureFlagDescription('bridgeConfigV2');

      expect(result).toBe('Bridge configuration and supported chains');
    });

    it('returns correct description for enableMultichainAccounts', () => {
      const result = getFeatureFlagDescription('enableMultichainAccounts');

      expect(result).toBe('Multichain account functionality');
    });

    it('returns correct description for enableMultichainAccountsState2', () => {
      const result = getFeatureFlagDescription(
        'enableMultichainAccountsState2',
      );

      expect(result).toBe('Enhanced multichain account features');
    });

    it('returns correct description for assetsDefiPositionsEnabled', () => {
      const result = getFeatureFlagDescription('assetsDefiPositionsEnabled');

      expect(result).toBe('DeFi positions tracking');
    });

    it('returns correct description for assetsAccountApiBalancesEnabled', () => {
      const result = getFeatureFlagDescription(
        'assetsAccountApiBalancesEnabled',
      );

      expect(result).toBe('Account API balance fetching');
    });

    it('returns correct description for bitcoinTestnetsEnabled', () => {
      const result = getFeatureFlagDescription('bitcoinTestnetsEnabled');

      expect(result).toBe('Bitcoin testnet support');
    });

    it('returns correct description for solanaTestnetsEnabled', () => {
      const result = getFeatureFlagDescription('solanaTestnetsEnabled');

      expect(result).toBe('Solana testnet support');
    });

    it('returns correct description for walletFrameworkRpcFailoverEnabled', () => {
      const result = getFeatureFlagDescription(
        'walletFrameworkRpcFailoverEnabled',
      );

      expect(result).toBe('RPC failover functionality');
    });

    it('returns correct description for trxStakingEnabled', () => {
      const result = getFeatureFlagDescription('trxStakingEnabled');

      expect(result).toBe('TRON staking features');
    });

    it('returns correct description for tokenSearchDiscoveryEnabled', () => {
      const result = getFeatureFlagDescription('tokenSearchDiscoveryEnabled');

      expect(result).toBe('Token search and discovery');
    });

    it('returns correct description for productSafetyDappScanningEnabled', () => {
      const result = getFeatureFlagDescription(
        'productSafetyDappScanningEnabled',
      );

      expect(result).toBe('DApp security scanning');
    });

    it('returns correct description for minimumAppVersion', () => {
      const result = getFeatureFlagDescription('minimumAppVersion');

      expect(result).toBe('Minimum app version requirements');
    });

    it('returns undefined for unknown feature flag keys', () => {
      const result = getFeatureFlagDescription('unknownFeatureFlag');

      expect(result).toBeUndefined();
    });

    it('returns undefined for empty string keys', () => {
      const result = getFeatureFlagDescription('');

      expect(result).toBeUndefined();
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
