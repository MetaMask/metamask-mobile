import {
  selectRewardsAnnouncementModalEnabledFlag,
  selectRewardsCardSpendFeatureFlags,
  selectRewardsMusdDepositEnabledFlag,
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

  describe('selectRewardsAnnouncementModalEnabledFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({
        rewardsAnnouncementModalEnabled: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({
        rewardsAnnouncementModalEnabled: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({
        rewardsAnnouncementModalEnabled: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({
        rewardsAnnouncementModalEnabled: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectRewardsAnnouncementModalEnabledFlag.resultFunc({});
      expect(result).toBe(false);
    });
  });

  describe('selectRewardsCardSpendFeatureFlags', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectRewardsCardSpendFeatureFlags.resultFunc({
        rewardsEnableCardSpend: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectRewardsCardSpendFeatureFlags.resultFunc({
        rewardsEnableCardSpend: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);
      const result = selectRewardsCardSpendFeatureFlags.resultFunc({
        rewardsEnableCardSpend: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectRewardsCardSpendFeatureFlags.resultFunc({
        rewardsEnableCardSpend: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectRewardsCardSpendFeatureFlags.resultFunc({});
      expect(result).toBe(false);
    });
  });

  describe('selectRewardsMusdDepositEnabledFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectRewardsMusdDepositEnabledFlag.resultFunc({
        rewardsEnableMusdDeposit: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectRewardsMusdDepositEnabledFlag.resultFunc({
        rewardsEnableMusdDeposit: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);
      const result = selectRewardsMusdDepositEnabledFlag.resultFunc({
        rewardsEnableMusdDeposit: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectRewardsMusdDepositEnabledFlag.resultFunc({
        rewardsEnableMusdDeposit: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });
      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectRewardsMusdDepositEnabledFlag.resultFunc({});
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
