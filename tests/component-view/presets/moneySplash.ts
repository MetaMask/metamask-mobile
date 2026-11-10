import type { MoneyAccount } from '@metamask/money-account-controller';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import { userInitialState } from '../../../app/reducers/user';
import { createStateFixture } from '../stateFixture';

export const MONEY_SPLASH_KEYRING_ID = 'entropy-source-1';
export const MONEY_SPLASH_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111';
export const MONAD_MAINNET_CHAIN_ID = '0x8f';

const MONAD_VAULT = {
  chainId: MONAD_MAINNET_CHAIN_ID,
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
} as const;

function moneyAccount(): MoneyAccount {
  return {
    id: 'money-1',
    address: MONEY_SPLASH_ACCOUNT_ADDRESS,
    type: 'eip155:eoa',
    scopes: [],
    methods: [],
    options: {
      entropy: {
        type: 'mnemonic',
        id: MONEY_SPLASH_KEYRING_ID,
        derivationPath: "m/44'/60'/0'/0/0",
        groupIndex: 0,
      },
      exportable: false,
    },
  };
}

export interface MoneySplashViewStateOptions {
  splashSeen?: boolean;
  onboardingSeen?: boolean;
  /** Omit the vault config so deposit setup fails and the fallback path runs. */
  hasVaultConfig?: boolean;
}

export function moneySplashViewState({
  splashSeen = false,
  onboardingSeen = false,
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
      ...(hasVaultConfig ? { moneyAccountVaultConfig: MONAD_VAULT } : {}),
    })
    .withOverrides({
      user: {
        ...userInitialState,
        moneySplashSeen: splashSeen,
        moneyOnboardingSeen: onboardingSeen,
      },
      engine: {
        backgroundState: {
          GeolocationController: {
            location: 'US',
          },
          KeyringController: {
            keyrings: [
              {
                type: ExtendedKeyringTypes.hd,
                accounts: ['0x0000000000000000000000000000000000000001'],
                metadata: { id: MONEY_SPLASH_KEYRING_ID },
              },
            ],
          },
          MoneyAccountController: {
            moneyAccounts: { [account.id]: account },
          },
        },
      },
    })
    .build();
}
