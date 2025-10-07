import {
  selectRewardsEnabledFlag,
  selectRewardsAnnouncementModalEnabledFlag,
} from '.';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('Rewards Feature Flag Selectors', () => {
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

  describe('selectRewardsEnabledFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectRewardsEnabledFlag.resultFunc({
        rewardsEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectRewardsEnabledFlag.resultFunc({
        rewardsEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);
      const result = selectRewardsEnabledFlag.resultFunc({
        rewardsEnabled: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectRewardsEnabledFlag.resultFunc({
        rewardsEnabled: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectRewardsEnabledFlag.resultFunc({});
      expect(result).toBe(false);
    });
  });

  describe('selectRewardsAnnouncementModalEnabledFlag', () => {
    it('returns true when remote flag is true', () => {
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({
        rewardsAnnouncementModal: true,
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is false', () => {
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({
        rewardsAnnouncementModal: false,
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({});
      expect(result).toBe(false);
    });
  });

  describe('validatedVersionGatedFeatureFlag', () => {
    const validRemoteFlag: VersionGatedFeatureFlag = {
      enabled: true,
      minimumVersion: '1.0.0',
    };

    const disabledRemoteFlag: VersionGatedFeatureFlag = {
      enabled: false,
      minimumVersion: '1.0.0',
    };

    describe('valid remote flag scenarios', () => {
      it('returns true when flag is enabled and version check passes', () => {
        const result = validatedVersionGatedFeatureFlag(validRemoteFlag);
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

      it('returns false when flag is disabled but version check passes', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(true);
        const result = validatedVersionGatedFeatureFlag(disabledRemoteFlag);
        expect(result).toBe(false);
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });

      it('returns false when flag is disabled and version check fails', () => {
        mockHasMinimumRequiredVersion.mockReturnValue(false);
        const result = validatedVersionGatedFeatureFlag(disabledRemoteFlag);
        expect(result).toBe(false);
        expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
      });
    });

    describe('invalid remote flag scenarios', () => {
      it('returns undefined when remote flag is null', () => {
        const result = validatedVersionGatedFeatureFlag(
          null as unknown as VersionGatedFeatureFlag,
        );
        expect(result).toBeUndefined();
      });

      it('returns undefined when remote flag is undefined', () => {
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
    });
  });
});
