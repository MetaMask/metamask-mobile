import {
  selectPerpsEquityEnabledFlag,
  selectPerpsEnabledDexs,
  PERPS_EQUITY_FEATURE_FLAG_NAME,
  PERPS_ENABLED_DEXS_FLAG_NAME,
} from '.';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('Perps Feature Flag Selectors', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  describe('selectPerpsEquityEnabledFlag', () => {
    it('returns false by default when feature flag is not present', () => {
      const result = selectPerpsEquityEnabledFlag.resultFunc({});
      expect(result).toBe(false);
    });

    it('returns true when remote flag is valid and enabled', () => {
      const result = selectPerpsEquityEnabledFlag.resultFunc({
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectPerpsEquityEnabledFlag.resultFunc({
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);
      const result = selectPerpsEquityEnabledFlag.resultFunc({
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectPerpsEquityEnabledFlag.resultFunc({
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is null', () => {
      const result = selectPerpsEquityEnabledFlag.resultFunc({
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: null,
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is undefined', () => {
      // Test case where flag key exists but value is explicitly undefined
      // This simulates a remote config that has the key but no value set
      const result = selectPerpsEquityEnabledFlag.resultFunc({
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: null,
      });
      expect(result).toBe(false);
    });
  });

  describe('selectPerpsEnabledDexs', () => {
    it('returns empty array by default when feature flag is not present', () => {
      const result = selectPerpsEnabledDexs.resultFunc({});
      expect(result).toEqual([]);
    });

    it('returns empty array when remote flag is empty array (auto-discovery)', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: [],
      });
      expect(result).toEqual([]);
    });

    it('returns whitelist when remote flag contains valid DEX names', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: ['xyz', 'test-dex'],
      });
      expect(result).toEqual(['xyz', 'test-dex']);
    });

    it('returns single DEX when remote flag contains one DEX', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: ['xyz'],
      });
      expect(result).toEqual(['xyz']);
    });

    it('returns empty array when remote flag is not an array', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: 'xyz',
      });
      expect(result).toEqual([]);
    });

    it('returns empty array when remote flag is null', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: null,
      });
      expect(result).toEqual([]);
    });

    it('returns empty array when remote flag is undefined', () => {
      // Test case where flag key exists but value is explicitly undefined
      // This simulates a remote config that has the key but no value set
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: null,
      });
      expect(result).toEqual([]);
    });

    it('returns empty array when remote flag contains non-string values', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: ['xyz', 123, 'test-dex'],
      });
      expect(result).toEqual([]);
    });

    it('returns empty array when remote flag is an object', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: { xyz: true },
      });
      expect(result).toEqual([]);
    });

    it('returns empty array when remote flag is a boolean', () => {
      const result = selectPerpsEnabledDexs.resultFunc({
        [PERPS_ENABLED_DEXS_FLAG_NAME]: true,
      });
      expect(result).toEqual([]);
    });
  });

  describe('Feature flag combinations', () => {
    it('handles both flags present and valid', () => {
      const featureFlags = {
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
        [PERPS_ENABLED_DEXS_FLAG_NAME]: ['xyz'],
      };

      const equityEnabled =
        selectPerpsEquityEnabledFlag.resultFunc(featureFlags);
      const enabledDexs = selectPerpsEnabledDexs.resultFunc(featureFlags);

      expect(equityEnabled).toBe(true);
      expect(enabledDexs).toEqual(['xyz']);
    });

    it('handles equity enabled with auto-discovery (empty array)', () => {
      const featureFlags = {
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
        [PERPS_ENABLED_DEXS_FLAG_NAME]: [],
      };

      const equityEnabled =
        selectPerpsEquityEnabledFlag.resultFunc(featureFlags);
      const enabledDexs = selectPerpsEnabledDexs.resultFunc(featureFlags);

      expect(equityEnabled).toBe(true);
      expect(enabledDexs).toEqual([]);
    });

    it('handles equity disabled with DEX whitelist (DEX list should be ignored)', () => {
      const featureFlags = {
        [PERPS_EQUITY_FEATURE_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
        [PERPS_ENABLED_DEXS_FLAG_NAME]: ['xyz'],
      };

      const equityEnabled =
        selectPerpsEquityEnabledFlag.resultFunc(featureFlags);
      const enabledDexs = selectPerpsEnabledDexs.resultFunc(featureFlags);

      expect(equityEnabled).toBe(false);
      expect(enabledDexs).toEqual(['xyz']); // Selector still returns the list
    });
  });
});
