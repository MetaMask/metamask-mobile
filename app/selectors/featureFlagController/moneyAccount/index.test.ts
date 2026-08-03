import {
  selectMoneyAccountDepositEnabledFlag,
  selectMoneyAccountWithdrawEnabledFlag,
  selectMoneyAccountVaultConfig,
  selectMoneyAccountDepositQuotePipelineEnabled,
  selectMoneyOnboardingStepperAnimationEnabled,
  MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY,
  MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY,
  DEV_VAULT_CONFIG,
  parseMoneyAccountVaultConfig,
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

    // Addresses are validated, so fixtures must be real ones.
    const REMOTE_CONFIG = {
      chainId: '0x8f',
      boringVault: '0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae',
      tellerAddress: '0x2d49ea58a4c70b62c8b56de971310d9e999c8117',
      accountantAddress: '0x7382c5b8b51b8c4f127b3123c1039581baa5a06b',
      lensAddress: '0xa816ecd922de94c6879ad23b9a884db257f20947',
    };

    afterEach(() => {
      if (originalDevEnabled === undefined) {
        delete process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED;
      } else {
        process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = originalDevEnabled;
      }
    });

    it('returns remote config when present', () => {
      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: REMOTE_CONFIG,
      });

      expect(result).toEqual(REMOTE_CONFIG);
    });

    it('accepts checksummed addresses unchanged', () => {
      const checksummed = {
        ...REMOTE_CONFIG,
        boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
      };

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: checksummed,
      });

      expect(result).toEqual(checksummed);
    });

    it('returns undefined when the remote config is malformed', () => {
      delete process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED;

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: { ...REMOTE_CONFIG, tellerAddress: '0xnope' },
      });

      expect(result).toBeUndefined();
    });

    it('falls back to the dev config when the remote config is malformed', () => {
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = 'true';

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: { ...REMOTE_CONFIG, tellerAddress: '0xnope' },
      });

      expect(result).toEqual(DEV_VAULT_CONFIG);
    });

    it('prefers remote config over dev fallback', () => {
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = 'true';

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountVaultConfig: REMOTE_CONFIG,
      });

      expect(result).toEqual(REMOTE_CONFIG);
    });
  });

  describe('parseMoneyAccountVaultConfig', () => {
    const RAW_CONFIG = {
      chainId: '0x8f',
      boringVault: '0xb4563bcd3b7764ccbf497f515585f70b6c3ea5ae',
      tellerAddress: '0x2d49ea58a4c70b62c8b56de971310d9e999c8117',
      accountantAddress: '0x7382c5b8b51b8c4f127b3123c1039581baa5a06b',
      lensAddress: '0xa816ecd922de94c6879ad23b9a884db257f20947',
    };

    it('parses a well-formed config', () => {
      expect(parseMoneyAccountVaultConfig(RAW_CONFIG)).toStrictEqual(
        RAW_CONFIG,
      );
    });

    it('parses the dev config it ships', () => {
      expect(parseMoneyAccountVaultConfig(DEV_VAULT_CONFIG)).toStrictEqual(
        DEV_VAULT_CONFIG,
      );
    });

    it('ignores unknown extra keys', () => {
      expect(
        parseMoneyAccountVaultConfig({ ...RAW_CONFIG, somethingElse: true }),
      ).toStrictEqual(RAW_CONFIG);
    });

    it.each([
      ['chainId is not hex', { chainId: '143' }],
      ['chainId is missing', { chainId: undefined }],
      ['chainId is not a string', { chainId: 143 }],
      ['an address is not hex', { tellerAddress: 'teller' }],
      ['an address is truncated', { lensAddress: '0xdeadbeef' }],
      [
        'an address has a bad checksum',
        { boringVault: '0xB4563BCD3b7764CCBf497f515585f70B6C3EA5Ae' },
      ],
      ['an address is missing', { accountantAddress: undefined }],
      ['an address is not a string', { boringVault: 12345 }],
    ])('returns undefined when %s', (_case, override) => {
      expect(
        parseMoneyAccountVaultConfig({ ...RAW_CONFIG, ...override }),
      ).toBeUndefined();
    });

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'not-an-object'],
      ['a number', 42],
    ])('returns undefined when the flag is %s', (_case, raw) => {
      expect(parseMoneyAccountVaultConfig(raw)).toBeUndefined();
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
  });
});
