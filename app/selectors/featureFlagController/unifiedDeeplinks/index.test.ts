import {
  selectUnifiedDeeplinksEnabled,
  FEATURE_FLAG_NAME,
  isUnifiedDeeplinksFeatureEnabled,
} from '.';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';
import { getFeatureFlagValue } from '../env';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../env', () => ({
  getFeatureFlagValue: jest.fn(),
}));

describe('selectUnifiedDeeplinksEnabled', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;
  const mockGetFeatureFlagValue = getFeatureFlagValue as jest.MockedFunction<
    typeof getFeatureFlagValue
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);

    // Default mock implementation - returns the remote value
    mockGetFeatureFlagValue.mockImplementation((_env, remote) => remote);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  describe('environment variable override', () => {
    it('returns true when getFeatureFlagValue returns true for env override', () => {
      mockGetFeatureFlagValue.mockReturnValue(true);

      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
      expect(mockGetFeatureFlagValue).toHaveBeenCalledWith(
        process.env.USE_UNIFIED_DEEPLINK_SERVICE,
        false,
      );
    });

    it('returns false when getFeatureFlagValue returns false for env override', () => {
      mockGetFeatureFlagValue.mockReturnValue(false);

      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
      expect(mockGetFeatureFlagValue).toHaveBeenCalledWith(
        process.env.USE_UNIFIED_DEEPLINK_SERVICE,
        true,
      );
    });
  });

  describe('remote feature flag behavior', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when feature flag is missing', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        otherFlag: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });
  });

  describe('validatedVersionGatedFeatureFlag edge cases', () => {
    it('returns false when flag is null', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: null,
      });

      expect(result).toBe(false);
    });

    it('returns false when flag property is not present', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        // Feature flag not present in remoteFeatureFlags
        otherFlag: { enabled: true, minimumVersion: '1.0.0' },
      });

      expect(result).toBe(false);
    });

    it('returns false when enabled property is missing', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when minimumVersion property is missing', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: true,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when enabled is not a boolean', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: 'true',
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when minimumVersion is not a string', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({
        [FEATURE_FLAG_NAME]: {
          enabled: true,
          minimumVersion: 100,
        },
      });

      expect(result).toBe(false);
    });
  });

  describe('default behavior', () => {
    it('returns false by default when no flag or env var is set', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({});

      expect(result).toBe(false);
    });

    it('respects DEFAULT_UNIFIED_DEEPLINKS_ENABLED constant', () => {
      const result = selectUnifiedDeeplinksEnabled.resultFunc({});

      // The default is false as per the implementation
      expect(result).toBe(false);
    });
  });

  describe('isUnifiedDeeplinksFeatureEnabled helper', () => {
    it('returns true when flag is valid and enabled', () => {
      const result = isUnifiedDeeplinksFeatureEnabled({
        enabled: true,
        minimumVersion: '1.0.0',
      });

      expect(result).toBe(true);
    });

    it('returns false when flag is valid but disabled', () => {
      const result = isUnifiedDeeplinksFeatureEnabled({
        enabled: false,
        minimumVersion: '1.0.0',
      });

      expect(result).toBe(false);
    });

    it('returns false when flag is undefined', () => {
      const result = isUnifiedDeeplinksFeatureEnabled(undefined);

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = isUnifiedDeeplinksFeatureEnabled({
        enabled: true,
        minimumVersion: '99.0.0',
      });

      expect(result).toBe(false);
    });
  });
});
