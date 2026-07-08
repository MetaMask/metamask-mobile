import {
  EnvironmentType,
  DistributionType,
} from '@metamask/remote-feature-flag-controller';
import {
  getFeatureFlagAppEnvironment,
  getFeatureFlagAppDistribution,
  shouldForceDirectMoneyMusdOff,
  withDirectMoneyMusdOff,
} from './utils';

describe('RemoteFeatureFlagController utils', () => {
  describe('getFeatureFlagAppEnvironment', () => {
    const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

    afterAll(() => {
      process.env.METAMASK_ENVIRONMENT = originalMetamaskEnvironment;
    });

    it('returns EnvironmentType.Production when METAMASK_ENVIRONMENT is production', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Production);
    });

    it('returns EnvironmentType.Beta when METAMASK_ENVIRONMENT is beta', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Beta);
    });

    // TODO: Remove this test case once pre-release env is removed
    it('returns EnvironmentType.ReleaseCandidate when METAMASK_ENVIRONMENT is pre-release', () => {
      process.env.METAMASK_ENVIRONMENT = 'pre-release';
      expect(getFeatureFlagAppEnvironment()).toBe(
        EnvironmentType.ReleaseCandidate,
      );
    });

    it('returns EnvironmentType.ReleaseCandidate when METAMASK_ENVIRONMENT is rc', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      expect(getFeatureFlagAppEnvironment()).toBe(
        EnvironmentType.ReleaseCandidate,
      );
    });

    it('returns EnvironmentType.Test when METAMASK_ENVIRONMENT is test', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Test);
    });

    it('returns EnvironmentType.Exp when METAMASK_ENVIRONMENT is exp', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Exp);
    });

    it('returns EnvironmentType.Development when METAMASK_ENVIRONMENT is dev', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Development);
    });

    it('returns EnvironmentType.Development when METAMASK_ENVIRONMENT is not set', () => {
      process.env.METAMASK_ENVIRONMENT = '';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Development);
    });
  });

  describe('getFeatureFlagAppDistribution', () => {
    const originalMetamaskBuildType = process.env.METAMASK_BUILD_TYPE;

    afterAll(() => {
      process.env.METAMASK_BUILD_TYPE = originalMetamaskBuildType;
    });

    it('returns DistributionType.Main when METAMASK_BUILD_TYPE is main', () => {
      process.env.METAMASK_BUILD_TYPE = 'main';
      expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Main);
    });

    it('returns DistributionType.Flask when METAMASK_BUILD_TYPE is flask', () => {
      process.env.METAMASK_BUILD_TYPE = 'flask';
      expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Flask);
    });

    it('returns DistributionType.Main when METAMASK_BUILD_TYPE is not set', () => {
      process.env.METAMASK_BUILD_TYPE = '';
      expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Main);
    });
  });

  // TEMP: RC test for ETH -> mUSD deposit, revert before merge
  describe('shouldForceDirectMoneyMusdOff', () => {
    const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

    afterAll(() => {
      process.env.METAMASK_ENVIRONMENT = originalMetamaskEnvironment;
    });

    it('returns false on production builds', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      expect(shouldForceDirectMoneyMusdOff()).toBe(false);
    });

    it('returns true on rc builds', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      expect(shouldForceDirectMoneyMusdOff()).toBe(true);
    });

    it('returns true when the environment is unset', () => {
      process.env.METAMASK_ENVIRONMENT = '';
      expect(shouldForceDirectMoneyMusdOff()).toBe(true);
    });
  });

  // TEMP: RC test for ETH -> mUSD deposit, revert before merge
  describe('withDirectMoneyMusdOff', () => {
    it('forces directMoneyMusdEnabled to false while preserving other keys', () => {
      const input = {
        confirmations_pay_fiat: {
          directMoneyMusdEnabled: true,
          enabledTransactionTypes: ['money_account_deposit'],
        },
        someOtherFlag: true,
      };

      const result = withDirectMoneyMusdOff(input);

      expect(result).not.toBe(input);
      expect(result.confirmations_pay_fiat).toStrictEqual({
        directMoneyMusdEnabled: false,
        enabledTransactionTypes: ['money_account_deposit'],
      });
      expect(result.someOtherFlag).toBe(true);
    });

    it('sets directMoneyMusdEnabled to false when the key is absent but the object exists', () => {
      const input = {
        confirmations_pay_fiat: {
          enabledTransactionTypes: [],
        },
      };

      const result = withDirectMoneyMusdOff(input);

      expect(result).not.toBe(input);
      expect(result.confirmations_pay_fiat).toStrictEqual({
        enabledTransactionTypes: [],
        directMoneyMusdEnabled: false,
      });
    });

    it('returns the same reference when confirmations_pay_fiat is missing', () => {
      const input = { someOtherFlag: true };
      expect(withDirectMoneyMusdOff(input)).toBe(input);
    });

    it('returns the same reference when directMoneyMusdEnabled is already false', () => {
      const input = {
        confirmations_pay_fiat: { directMoneyMusdEnabled: false },
      };
      expect(withDirectMoneyMusdOff(input)).toBe(input);
    });
  });
});
