import { userInitialState } from '../../../app/reducers/user';
import { createStateFixture } from '../stateFixture';
import {
  MONAD_MAINNET_CHAIN_ID,
  MONAD_VAULT,
  MONEY_TEST_ACCOUNT_ADDRESS,
  MONEY_TEST_KEYRING_ID,
  moneyAccount,
  withMoneyAccountOverrides,
} from './moneyAccount';

export const MONEY_SPLASH_KEYRING_ID = MONEY_TEST_KEYRING_ID;
export const MONEY_SPLASH_ACCOUNT_ADDRESS = MONEY_TEST_ACCOUNT_ADDRESS;
export { MONAD_MAINNET_CHAIN_ID };

export interface MoneySplashViewStateOptions {
  splashSeen?: boolean;
  onboardingSeen?: boolean;
  onboardingEnabled?: boolean;
  /** Omit the vault config so deposit setup fails and the fallback path runs. */
  hasVaultConfig?: boolean;
}

export function moneySplashViewState({
  splashSeen = false,
  onboardingSeen = false,
  onboardingEnabled = false,
  hasVaultConfig = true,
}: MoneySplashViewStateOptions = {}) {
  const account = moneyAccount();

  return createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({
      moneyEnableMoneyAccount: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
      moneyEnableSplash: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
      moneyEnableOnboardingStepperAnimation: {
        enabled: onboardingEnabled,
        minimumVersion: '0.0.0',
      },
      ...(hasVaultConfig ? { moneyAccountVaultConfig: MONAD_VAULT } : {}),
    })
    .withOverrides({
      user: {
        ...userInitialState,
        moneySplashSeen: splashSeen,
        moneyOnboardingSeen: onboardingSeen,
      },
      ...withMoneyAccountOverrides(account, { includeGeolocation: true }),
    })
    .build();
}
