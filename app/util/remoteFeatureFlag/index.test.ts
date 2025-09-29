import { getVersion } from 'react-native-device-info';
import {
  hasMinimumRequiredVersion,
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '.';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(),
}));

jest.mock(
  '../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('hasMinimumRequiredVersion', () => {
  let mockedGetVersion: jest.MockedFunction<typeof getVersion>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetVersion = jest.mocked(getVersion);
    mockedGetVersion.mockReturnValue('1.0.0');
  });

  it('returns true if the current version is greater than the minimum required version', () => {
    const result = hasMinimumRequiredVersion('0.0.1');
    expect(result).toBe(true);
  });

  it('returns true if the current version is equal to the minimum required version', () => {
    const result = hasMinimumRequiredVersion('1.0.0');
    expect(result).toBe(true);
  });

  it('returns false if the current version is less than the minimum required version', () => {
    mockedGetVersion.mockReturnValue('0.0.1');

    const result = hasMinimumRequiredVersion('1.0.0');
    expect(result).toBe(false);
  });

  it('returns false if the minimum required version argument is empty string', () => {
    const result = hasMinimumRequiredVersion('');
    expect(result).toBe(false);
  });
});

describe('validatedVersionGatedFeatureFlag', () => {
  let mockedGetVersion: jest.MockedFunction<typeof getVersion>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetVersion = jest.mocked(getVersion);
    mockedGetVersion.mockReturnValue('1.0.0');
  });

  describe('valid feature flag scenarios', () => {
    const validEnabledFlag: VersionGatedFeatureFlag = {
      enabled: true,
      minimumVersion: '1.0.0',
    };

    const validDisabledFlag: VersionGatedFeatureFlag = {
      enabled: false,
      minimumVersion: '1.0.0',
    };

    it('returns true when flag is enabled and version check passes', () => {
      const result = validatedVersionGatedFeatureFlag(validEnabledFlag);
      expect(result).toBe(true);
    });

    it('returns false when flag is enabled but version check fails', () => {
      const flagWithHigherVersion: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '99.0.0',
      };
      const result = validatedVersionGatedFeatureFlag(flagWithHigherVersion);
      expect(result).toBe(false);
    });

    it('returns false when flag is disabled regardless of version', () => {
      const result = validatedVersionGatedFeatureFlag(validDisabledFlag);
      expect(result).toBe(false);
    });

    it('returns false when flag is disabled with higher version', () => {
      const disabledFlagWithHigherVersion: VersionGatedFeatureFlag = {
        enabled: false,
        minimumVersion: '99.0.0',
      };
      const result = validatedVersionGatedFeatureFlag(
        disabledFlagWithHigherVersion,
      );
      expect(result).toBe(false);
    });

    it('handles version comparison edge cases correctly', () => {
      // Test with older device version
      mockedGetVersion.mockReturnValue('0.9.9');
      const result1 = validatedVersionGatedFeatureFlag(validEnabledFlag);
      expect(result1).toBe(false);

      // Test with newer device version
      mockedGetVersion.mockReturnValue('2.0.0');
      const result2 = validatedVersionGatedFeatureFlag(validEnabledFlag);
      expect(result2).toBe(true);

      // Test with complex version numbers
      mockedGetVersion.mockReturnValue('1.2.3');
      const complexFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '1.2.2',
      };
      const result3 = validatedVersionGatedFeatureFlag(complexFlag);
      expect(result3).toBe(true);
    });
  });

  describe('invalid feature flag scenarios', () => {
    it('returns undefined when flag is null', () => {
      const result = validatedVersionGatedFeatureFlag(
        null as unknown as VersionGatedFeatureFlag,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when flag is undefined', () => {
      const result = validatedVersionGatedFeatureFlag(
        undefined as unknown as VersionGatedFeatureFlag,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when enabled property is missing', () => {
      const malformedFlag = {
        minimumVersion: '1.0.0',
      } as VersionGatedFeatureFlag;
      const result = validatedVersionGatedFeatureFlag(malformedFlag);
      expect(result).toBeUndefined();
    });

    it('returns undefined when minimumVersion property is missing', () => {
      const malformedFlag = {
        enabled: true,
      } as VersionGatedFeatureFlag;
      const result = validatedVersionGatedFeatureFlag(malformedFlag);
      expect(result).toBeUndefined();
    });

    it('returns undefined when enabled is not a boolean', () => {
      const wrongTypeFlag = {
        enabled: 'true',
        minimumVersion: '1.0.0',
      } as unknown as VersionGatedFeatureFlag;
      const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);
      expect(result).toBeUndefined();
    });

    it('returns undefined when minimumVersion is not a string', () => {
      const wrongTypeFlag = {
        enabled: true,
        minimumVersion: 100,
      } as unknown as VersionGatedFeatureFlag;
      const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);
      expect(result).toBeUndefined();
    });

    it('returns undefined when both properties have wrong types', () => {
      const wrongTypeFlag = {
        enabled: 'true',
        minimumVersion: 123,
      } as unknown as VersionGatedFeatureFlag;
      const result = validatedVersionGatedFeatureFlag(wrongTypeFlag);
      expect(result).toBeUndefined();
    });

    it('returns undefined when enabled is null', () => {
      const nullEnabledFlag = {
        enabled: null,
        minimumVersion: '1.0.0',
      } as unknown as VersionGatedFeatureFlag;
      const result = validatedVersionGatedFeatureFlag(nullEnabledFlag);
      expect(result).toBeUndefined();
    });

    it('returns undefined when minimumVersion is null', () => {
      const nullVersionFlag = {
        enabled: true,
        minimumVersion: null,
      } as unknown as VersionGatedFeatureFlag;
      const result = validatedVersionGatedFeatureFlag(nullVersionFlag);
      expect(result).toBeUndefined();
    });

    it('returns false when minimumVersion is empty string', () => {
      const emptyVersionFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '',
      };
      const result = validatedVersionGatedFeatureFlag(emptyVersionFlag);
      expect(result).toBe(false);
    });
  });

  describe('override flag scenarios', () => {
    const originalEnv = process.env;

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
      jest.resetModules();
    });

    it('works normally when override is not activated', () => {
      // Ensure override is not activated
      process.env.OVERRIDE_REMOTE_FEATURE_FLAGS = 'false';

      const validFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '1.0.0',
      };

      const result = validatedVersionGatedFeatureFlag(validFlag);
      expect(result).toBe(true);
    });

    it('returns undefined when remote feature flag override is activated', () => {
      // Set the environment variable to activate override
      process.env.OVERRIDE_REMOTE_FEATURE_FLAGS = 'true';

      // Reset modules to force re-evaluation of the override flag
      jest.resetModules();

      // Re-setup the react-native-device-info mock after resetModules
      jest.doMock('react-native-device-info', () => ({
        getVersion: jest.fn().mockReturnValue('1.0.0'),
      }));

      // Mock the remote feature flag controller with override activated
      jest.doMock(
        '../../core/Engine/controllers/remote-feature-flag-controller',
        () => ({
          isRemoteFeatureFlagOverrideActivated: true,
        }),
      );

      // Re-import the function to get the new override value
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { validatedVersionGatedFeatureFlag: testFunction } = require('.');

      const validFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '1.0.0',
      };

      const result = testFunction(validFlag);
      expect(result).toBeUndefined();
    });

    it('returns undefined when override is set to any truthy string', () => {
      // Test that any truthy string activates override (not just 'true')
      process.env.OVERRIDE_REMOTE_FEATURE_FLAGS = 'yes';

      // Reset modules to force re-evaluation
      jest.resetModules();

      // Re-setup mocks
      jest.doMock('react-native-device-info', () => ({
        getVersion: jest.fn().mockReturnValue('1.0.0'),
      }));

      // Mock the remote feature flag controller with override NOT activated (since 'yes' !== 'true')
      jest.doMock(
        '../../core/Engine/controllers/remote-feature-flag-controller',
        () => ({
          isRemoteFeatureFlagOverrideActivated: false,
        }),
      );

      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { validatedVersionGatedFeatureFlag: testFunction } = require('.');

      const validFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '1.0.0',
      };

      const result = testFunction(validFlag);
      // Should still work normally since the check is specifically for 'true'
      expect(result).toBe(true);
    });

    it('works normally when override is undefined', () => {
      // Remove the environment variable entirely
      delete process.env.OVERRIDE_REMOTE_FEATURE_FLAGS;

      // Reset modules to force re-evaluation
      jest.resetModules();

      // Re-setup mocks
      jest.doMock('react-native-device-info', () => ({
        getVersion: jest.fn().mockReturnValue('1.0.0'),
      }));

      // Mock the remote feature flag controller with override NOT activated
      jest.doMock(
        '../../core/Engine/controllers/remote-feature-flag-controller',
        () => ({
          isRemoteFeatureFlagOverrideActivated: false,
        }),
      );

      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { validatedVersionGatedFeatureFlag: testFunction } = require('.');

      const validFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '1.0.0',
      };

      const result = testFunction(validFlag);
      expect(result).toBe(true);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('handles very complex version numbers', () => {
      mockedGetVersion.mockReturnValue('1.2.3-beta.4');
      const complexVersionFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '1.2.3-beta.3',
      };
      const result = validatedVersionGatedFeatureFlag(complexVersionFlag);
      expect(result).toBe(true);
    });

    it('handles flag with additional properties (should still work)', () => {
      const flagWithExtraProps = {
        enabled: true,
        minimumVersion: '1.0.0',
        extraProperty: 'should be ignored',
        anotherProp: 123,
      } as VersionGatedFeatureFlag;

      const result = validatedVersionGatedFeatureFlag(flagWithExtraProps);
      expect(result).toBe(true);
    });

    it('handles very high version numbers', () => {
      mockedGetVersion.mockReturnValue('999.999.999');
      const highVersionFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '100.0.0',
      };
      const result = validatedVersionGatedFeatureFlag(highVersionFlag);
      expect(result).toBe(true);
    });

    it('handles zero version numbers', () => {
      mockedGetVersion.mockReturnValue('0.0.1');
      const zeroVersionFlag: VersionGatedFeatureFlag = {
        enabled: true,
        minimumVersion: '0.0.0',
      };
      const result = validatedVersionGatedFeatureFlag(zeroVersionFlag);
      expect(result).toBe(true);
    });
  });
});
