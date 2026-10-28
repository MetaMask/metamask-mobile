import {
  selectMoneyAccountDepositEnabledFlag,
  selectMoneyAccountWithdrawEnabledFlag,
  selectMoneyAccountVaultConfig,
  selectMoneyAccountPremiumVaultConfig,
  selectMoneyAccountDepositQuotePipelineEnabled,
  selectMoneyMovementNeobank,
  selectNeobankMarkets,
  isVbaGeoBypassEnabled,
  selectMoneyOnboardingStepperAnimationEnabled,
  selectProSubscriptionEnabled,
  SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY,
  MONEY_ACCOUNT_DEPOSIT_QUOTE_PIPELINE_FLAG_KEY,
  MONEY_ENABLE_ONBOARDING_STEPPER_ANIMATION_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY,
  DEV_VAULT_CONFIG,
} from './index';
import type { Json } from '@metamask/utils';
import { getVersion } from 'react-native-device-info';

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
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Re-establish implementations wiped by resetAllMocks.
    jest.mocked(getVersion).mockReturnValue('99.0.0');
  });

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

  describe('selectMoneyMovementNeobank', () => {
    const disabled = {
      isEnabled: false,
      chooseCurrency: false,
      regionOverride: undefined,
    };
    const enabledFlag = {
      enabled: true,
      minimumVersion: '0.0.0',
    };

    it('reads the camelCase key Client Config stores for money-movement-neobank', () => {
      expect(MONEY_MOVEMENT_NEOBANK_FLAG_KEY).toBe('moneyMovementNeobank');
    });

    it('reads the gate from a progressive-rollout wrapper', () => {
      const result = selectMoneyMovementNeobank.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          name: 'treatment',
          value: enabledFlag,
        },
      });

      expect(result).toEqual({
        isEnabled: true,
        chooseCurrency: false,
        regionOverride: undefined,
      });
    });

    it('does not read regions, regionCurrencies, or defaultCurrency even when present', () => {
      const result = selectMoneyMovementNeobank.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          ...enabledFlag,
          regions: ['BR', 'US'],
          regionCurrencies: { BR: 'BRL' },
          defaultCurrency: 'USD',
        },
      });

      expect(result).toEqual({
        isEnabled: true,
        chooseCurrency: false,
        regionOverride: undefined,
      });
    });

    it('reads chooseCurrency only when it is literally true', () => {
      const readChooseCurrency = (chooseCurrency: boolean | string) =>
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: { ...enabledFlag, chooseCurrency },
        }).chooseCurrency;

      expect(readChooseCurrency(true)).toBe(true);
      expect(readChooseCurrency(false)).toBe(false);
      expect(readChooseCurrency('true')).toBe(false);
      expect(
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: enabledFlag,
        }).chooseCurrency,
      ).toBe(false);
    });

    it('reads chooseCurrency from a progressive-rollout wrapper', () => {
      const result = selectMoneyMovementNeobank.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          name: 'treatment',
          value: { ...enabledFlag, chooseCurrency: true },
        },
      });

      expect(result.chooseCurrency).toBe(true);
    });

    it('turns chooseCurrency off when the flag is disabled', () => {
      const result = selectMoneyMovementNeobank.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          ...enabledFlag,
          enabled: false,
          chooseCurrency: true,
        },
      });

      expect(result).toEqual(disabled);
    });

    it('uppercases and trims regionOverride without limiting it to a currency', () => {
      const result = selectMoneyMovementNeobank.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          ...enabledFlag,
          regionOverride: ' de ',
        },
      });

      expect(result.regionOverride).toBe('DE');
    });

    it('ignores a blank, missing, or non-string regionOverride', () => {
      const readOverride = (regionOverride: Json) =>
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
            ...enabledFlag,
            regionOverride,
          },
        }).regionOverride;

      expect(readOverride('')).toBeUndefined();
      expect(readOverride('   ')).toBeUndefined();
      expect(readOverride(null)).toBeUndefined();
      expect(readOverride(1)).toBeUndefined();
      expect(readOverride(true)).toBeUndefined();
      expect(readOverride(['BR'])).toBeUndefined();
      expect(
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: enabledFlag,
        }).regionOverride,
      ).toBeUndefined();
    });

    it('drops a present regionOverride when the gate is closed', () => {
      const readClosed = (flag: Record<string, Json>) =>
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
            ...enabledFlag,
            regionOverride: 'BR',
            ...flag,
          },
        });

      expect(readClosed({ enabled: false })).toEqual(disabled);
      expect(readClosed({ minimumVersion: '999.0.0' })).toEqual(disabled);
      expect(
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
            regionOverride: 'BR',
          },
        }),
      ).toEqual(disabled);
    });

    it('is disabled when the flag serves enabled: false', () => {
      const result = selectMoneyMovementNeobank.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          ...enabledFlag,
          enabled: false,
        },
      });

      expect(result).toEqual(disabled);
    });

    it('is disabled when the minimum version requirement fails', () => {
      const result = selectMoneyMovementNeobank.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
          ...enabledFlag,
          minimumVersion: '999.0.0',
        },
      });

      expect(result).toEqual(disabled);
    });

    it('is disabled when the flag is absent or malformed', () => {
      expect(selectMoneyMovementNeobank.resultFunc({})).toEqual(disabled);
      expect(
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: 'not-an-object',
        }),
      ).toEqual(disabled);
      expect(
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: { enabled: true },
        }),
      ).toEqual(disabled);
      expect(
        selectMoneyMovementNeobank.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: true,
        }),
      ).toEqual(disabled);
    });
  });

  describe('selectNeobankMarkets', () => {
    const brlFlagOn = {
      enabled: true,
      minimumVersion: '0.0.0',
      currency: 'BRL',
      regions: ['br', ' BR ', 1],
    };
    const usdFlagOn = {
      enabled: true,
      minimumVersion: '0.0.0',
      currency: 'USD',
      regions: ['US'],
    };

    it('returns each open market with normalized regions', () => {
      const result = selectNeobankMarkets.resultFunc({
        [MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY]: brlFlagOn,
        [MONEY_MOVEMENT_NEOBANK_USD_FLAG_KEY]: { name: 'on', value: usdFlagOn },
      });

      expect(result).toEqual([
        { currency: 'BRL', regions: ['BR'] },
        { currency: 'USD', regions: ['US'] },
      ]);
    });

    it.each([
      ['missing', undefined],
      ['disabled', { ...brlFlagOn, enabled: false }],
      ['too old', { ...brlFlagOn, minimumVersion: '999.0.0' }],
      ['for another currency', { ...brlFlagOn, currency: 'USD' }],
      [
        'an unresolved threshold array',
        [
          {
            name: 'on',
            scope: { type: 'threshold', value: 1 },
            value: brlFlagOn,
          },
        ],
      ],
    ])('leaves out a flag that is %s', (_label, flag) => {
      expect(
        selectNeobankMarkets.resultFunc({
          [MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY]: flag as Json,
        }),
      ).toEqual([]);
    });
  });

  describe('isVbaGeoBypassEnabled', () => {
    const originalBypass = process.env.MM_MONEY_VBA_GEO_BYPASS;

    afterEach(() => {
      if (originalBypass === undefined) {
        delete process.env.MM_MONEY_VBA_GEO_BYPASS;
      } else {
        process.env.MM_MONEY_VBA_GEO_BYPASS = originalBypass;
      }
    });

    it('returns true only when the bypass env var is "true"', () => {
      process.env.MM_MONEY_VBA_GEO_BYPASS = 'true';

      expect(isVbaGeoBypassEnabled()).toBe(true);
    });

    it('returns false when the bypass env var is unset or not "true"', () => {
      delete process.env.MM_MONEY_VBA_GEO_BYPASS;
      expect(isVbaGeoBypassEnabled()).toBe(false);

      process.env.MM_MONEY_VBA_GEO_BYPASS = 'false';
      expect(isVbaGeoBypassEnabled()).toBe(false);
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

  describe('selectProSubscriptionEnabled', () => {
    const originalLocalOverride = process.env.MM_PRO_SUBSCRIPTION_FLOW_ENABLED;

    afterEach(() => {
      if (originalLocalOverride === undefined) {
        delete process.env.MM_PRO_SUBSCRIPTION_FLOW_ENABLED;
      } else {
        process.env.MM_PRO_SUBSCRIPTION_FLOW_ENABLED = originalLocalOverride;
      }
    });

    it('uses the camelCased key as served by client-config-api-mobile', () => {
      expect(SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY).toBe(
        'subscriptionMoneyAccountOrangeEnabled',
      );
    });

    it('returns the remote value when the flag is served as a boolean', () => {
      expect(
        selectProSubscriptionEnabled.resultFunc({
          [SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY]: true,
        }),
      ).toBe(true);
      expect(
        selectProSubscriptionEnabled.resultFunc({
          [SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY]: false,
        }),
      ).toBe(false);
    });

    it('returns true when enabled and the minimum version passes', () => {
      const result = selectProSubscriptionEnabled.resultFunc({
        [SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '0.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when the flag is disabled', () => {
      const result = selectProSubscriptionEnabled.resultFunc({
        [SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY]: {
          enabled: false,
          minimumVersion: '0.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when the minimum version requirement fails', () => {
      const result = selectProSubscriptionEnabled.resultFunc({
        [SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '999.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns true when the local override is enabled, regardless of remote flag', () => {
      process.env.MM_PRO_SUBSCRIPTION_FLOW_ENABLED = 'true';

      expect(
        selectProSubscriptionEnabled.resultFunc({
          [SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY]: {
            enabled: false,
            minimumVersion: '0.0.0',
          },
        }),
      ).toBe(true);
    });

    it('defaults to false when the flag is absent or malformed', () => {
      process.env.MM_PRO_SUBSCRIPTION_FLOW_ENABLED = 'false';

      expect(selectProSubscriptionEnabled.resultFunc({})).toBe(false);
      expect(
        selectProSubscriptionEnabled.resultFunc({
          [SUBSCRIPTION_MONEY_ACCOUNT_ORANGE_ENABLED_FLAG_KEY]: 'not-a-flag',
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

  describe('selectMoneyAccountPremiumVaultConfig', () => {
    const premiumConfig = {
      chainId: '0x8f',
      boringVault: '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7',
      tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
      accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
      lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
      underlyingToken: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    };

    it('returns the parsed premium vault config when the flag is valid', () => {
      const result = selectMoneyAccountPremiumVaultConfig.resultFunc({
        moneyAccountPremiumVaultConfig: premiumConfig,
      });

      expect(result).toEqual(premiumConfig);
    });

    it('returns undefined when the premium vault flag is missing', () => {
      const result = selectMoneyAccountPremiumVaultConfig.resultFunc({});

      expect(result).toBeUndefined();
    });

    it('returns undefined when the premium vault flag is malformed', () => {
      const result = selectMoneyAccountPremiumVaultConfig.resultFunc({
        moneyAccountPremiumVaultConfig: {
          ...premiumConfig,
          lensAddress: '0x0',
        },
      });

      expect(result).toBeUndefined();
    });
  });
});
