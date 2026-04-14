import {
  selectMoneyAccountDepositEnabledFlag,
  selectMoneyAccountWithdrawEnabledFlag,
  selectMoneyAccountVaultConfig,
  DEV_VAULT_CONFIG,
} from './index';

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
        moneyAccountDepositConfig: remoteConfig,
      });

      expect(result).toEqual(remoteConfig);
    });

    it('returns dev fallback when remote config is absent and dev flag is enabled', () => {
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = 'true';

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountDepositConfig: null,
      });

      expect(result).toEqual(DEV_VAULT_CONFIG);
    });

    it('returns undefined when remote config is absent and dev flag is disabled', () => {
      process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED = 'false';

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountDepositConfig: null,
      });

      expect(result).toBeUndefined();
    });

    it('returns undefined when remote config is absent and dev env var is not set', () => {
      delete process.env.MM_MONEY_DEPOSIT_CONFIG_DEV_ENABLED;

      const result = selectMoneyAccountVaultConfig.resultFunc({
        moneyAccountDepositConfig: null,
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
        moneyAccountDepositConfig: remoteConfig,
      });

      expect(result).toEqual(remoteConfig);
    });
  });
});
