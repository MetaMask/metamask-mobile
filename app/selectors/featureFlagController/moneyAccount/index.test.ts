import {
  selectMoneyAccountDepositEnabledFlag,
  selectMoneyAccountWithdrawEnabledFlag,
  selectMoneyAccountVaultConfig,
  selectMoneyAccountDepositQuotePipelineEnabled,
  selectMoneyOnboardingStepperAnimationEnabled,
  MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY,
  MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY,
  DEV_VAULT_CONFIG,
} from './index';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('99.0.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('Money Account feature flag selectors', () => {
  describe('selectMoneyAccountDepositEnabledFlag', () => {
    it('returns true when moneyAccountDepositEnabled is true', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountDepositEnabled: true,
          moneyAccountWithdrawEnabled: false,
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when moneyAccountDepositEnabled is false', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountDepositEnabled: false,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when moneyAccount flag is undefined', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when moneyAccountDepositEnabled is not set', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({
        moneyAccount: {},
      });

      expect(result).toBe(false);
    });
  });

  describe('selectMoneyAccountWithdrawEnabledFlag', () => {
    it('returns true when moneyAccountWithdrawEnabled is true', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountDepositEnabled: false,
          moneyAccountWithdrawEnabled: true,
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when moneyAccountWithdrawEnabled is false', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountWithdrawEnabled: false,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when moneyAccount flag is undefined', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when moneyAccountWithdrawEnabled is not set', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({
        moneyAccount: {},
      });

      expect(result).toBe(false);
    });
  });

  describe('selectMoneyAccountDepositQuotePipelineEnabled', () => {
    const originalLocalOverride =
      process.env.MM_MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_ENABLED;

    afterEach(() => {
      if (originalLocalOverride === undefined) {
        delete process.env.MM_MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_ENABLED;
      } else {
        process.env.MM_MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_ENABLED =
          originalLocalOverride;
      }
    });

    it('uses the dedicated remote flag key', () => {
      expect(MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY).toBe(
        'moneyAccountDepositQuotePipeline',
      );
    });

    it('returns true when enabled and the minimum version passes', () => {
      const result = selectMoneyAccountDepositQuotePipelineEnabled.resultFunc({
        [MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '0.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when the flag is disabled', () => {
      const result = selectMoneyAccountDepositQuotePipelineEnabled.resultFunc({
        [MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY]: {
          enabled: false,
          minimumVersion: '0.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when the minimum version requirement fails', () => {
      const result = selectMoneyAccountDepositQuotePipelineEnabled.resultFunc({
        [MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '999.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('uses the local environment override when enabled', () => {
      process.env.MM_MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_ENABLED = 'true';

      expect(selectMoneyAccountDepositQuotePipelineEnabled.resultFunc({})).toBe(
        true,
      );
    });

    it('defaults to false when the flag is absent or malformed', () => {
      process.env.MM_MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_ENABLED = 'false';

      expect(selectMoneyAccountDepositQuotePipelineEnabled.resultFunc({})).toBe(
        false,
      );
      expect(
        selectMoneyAccountDepositQuotePipelineEnabled.resultFunc({
          [MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY]: true,
        }),
      ).toBe(false);
    });
  });

  describe('selectMoneyOnboardingStepperAnimationEnabled', () => {
    it('exposes the client-config flag key for registry alignment', () => {
      expect(MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY).toBe(
        'moneyEnableOnboardingStepperAnimation',
      );
    });

    it('returns true when enabled and the minimum version passes', () => {
      const result = selectMoneyOnboardingStepperAnimationEnabled.resultFunc({
        [MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '0.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when enabled is false', () => {
      const result = selectMoneyOnboardingStepperAnimationEnabled.resultFunc({
        [MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY]: {
          enabled: false,
          minimumVersion: '0.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when the minimum version requirement fails', () => {
      const result = selectMoneyOnboardingStepperAnimationEnabled.resultFunc({
        [MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '999.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when the flag is absent (safe default)', () => {
      const result = selectMoneyOnboardingStepperAnimationEnabled.resultFunc(
        {},
      );

      expect(result).toBe(false);
    });
  });

  describe('selectMoneyAccountVaultConfig', () => {
    const originalDevEnabled = process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED;

    afterEach(() => {
      if (originalDevEnabled === undefined) {
        delete process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED;
      } else {
        process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = originalDevEnabled;
      }
    });

    it('returns remote config when present', () => {
      const remoteConfig = {
        chainId: '0x1',
        boringVault: '0xvault',
        tellerAddress: '0xteller',
        accountantAddress: '0xaccountant',
        lensAddress: '0xlens',
      };

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: remoteConfig,
      });

      expect(result).toEqual(remoteConfig);
    });

    it('returns dev fallback when remote config is absent and dev flag is enabled', () => {
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = 'true';

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: null,
      });

      expect(result).toEqual(DEV_VAULT_CONFIG);
    });

    it('returns undefined when remote config is absent and dev flag is disabled', () => {
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = 'false';

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: null,
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when remote config is absent and dev env var is not set', () => {
      delete process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED;

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: null,
      });

      expect(result).toBeUndefined();
    });

    it('prefers remote config over dev fallback', () => {
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = 'true';

      const remoteConfig = {
        chainId: '0x89',
        boringVault: '0xremoteVault',
        tellerAddress: '0xremoteTeller',
        accountantAddress: '0xremoteAccountant',
        lensAddress: '0xremoteLens',
      };

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: remoteConfig,
      });

      expect(result).toEqual(remoteConfig);
    });
  });
});
