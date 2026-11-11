import type { MoneyAccount } from '@metamask/money-account-controller';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import { createStateFixture } from '../stateFixture';

export const MONEY_ACTIVITY_ACCOUNT =
  '0x1111111111111111111111111111111111111111';
export const MONEY_ACTIVITY_KEYRING_ID = 'entropy-source-1';

export const MONEY_STANDARD_VAULT = {
  chainId: '0x8f',
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
} as const;

export const MONEY_PREMIUM_VAULT = {
  chainId: '0x8f',
  boringVault: '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
  underlyingToken: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
} as const;

function moneyAccount(): MoneyAccount {
  return {
    id: 'money-1',
    address: MONEY_ACTIVITY_ACCOUNT,
    type: 'eip155:eoa',
    scopes: [],
    methods: [],
    options: {
      entropy: {
        type: 'mnemonic',
        id: MONEY_ACTIVITY_KEYRING_ID,
        derivationPath: "m/44'/60'/0'/0/0",
        groupIndex: 0,
      },
      exportable: false,
    },
  };
}

export function moneyActivityViewState({
  historicalValuationsEnabled,
}: {
  historicalValuationsEnabled: boolean;
}): DeepPartial<RootState> {
  const account = moneyAccount();

  return createStateFixture()
    .withMinimalAccounts()
    .withPreferences({ privacyMode: false })
    .withMinimalMainnetNetwork()
    .withMinimalKeyringController()
    .withMinimalAnalyticsController()
    .withAccountTreeForSelectedAccount()
    .withRemoteFeatureFlags({
      moneyEnableMoneyAccount: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
      moneyEnableActivityDetails: {
        enabled: true,
        minimumVersion: '0.0.0',
      },
      moneyEnableHistoricalVaultShareValuations: {
        enabled: historicalValuationsEnabled,
        minimumVersion: '0.0.0',
      },
      moneyAccountVaultConfig: MONEY_STANDARD_VAULT,
      moneyAccountPremiumVaultConfig: MONEY_PREMIUM_VAULT,
    })
    .withOverrides({
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
                metadata: { id: MONEY_ACTIVITY_KEYRING_ID },
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
