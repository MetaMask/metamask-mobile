import type { MoneyAccount } from '@metamask/money-account-controller';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';

export const MONEY_TEST_ACCOUNT_ADDRESS =
  '0x1111111111111111111111111111111111111111';
export const MONEY_TEST_KEYRING_ID = 'entropy-source-1';
const MONEY_TEST_KEYRING_ACCOUNT = '0x0000000000000000000000000000000000000001';
export const MONAD_MAINNET_CHAIN_ID = '0x8f';

export const MONAD_VAULT = {
  chainId: MONAD_MAINNET_CHAIN_ID,
  boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
  tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
  accountantAddress: '0x7382c5b8B51B8C4f127B3123C1039581BAA5A06B',
  lensAddress: '0xA816ECd922de94c6879AD23B9A884dB257F20947',
} as const;

export function moneyAccount(): MoneyAccount {
  return {
    id: 'money-1',
    address: MONEY_TEST_ACCOUNT_ADDRESS,
    type: 'eip155:eoa',
    scopes: [],
    methods: [],
    options: {
      entropy: {
        type: 'mnemonic',
        id: MONEY_TEST_KEYRING_ID,
        derivationPath: "m/44'/60'/0'/0/0",
        groupIndex: 0,
      },
      exportable: false,
    },
  };
}

export function withMoneyAccountOverrides(
  account: MoneyAccount,
  {
    includeGeolocation = false,
    includeMoneyAccount = true,
  }: {
    includeGeolocation?: boolean;
    includeMoneyAccount?: boolean;
  } = {},
) {
  return {
    engine: {
      backgroundState: {
        ...(includeGeolocation
          ? { GeolocationController: { location: 'US' } }
          : {}),
        KeyringController: {
          keyrings: [
            {
              type: ExtendedKeyringTypes.hd,
              accounts: [MONEY_TEST_KEYRING_ACCOUNT],
              metadata: { id: MONEY_TEST_KEYRING_ID },
            },
          ],
        },
        MoneyAccountController: {
          moneyAccounts: includeMoneyAccount ? { [account.id]: account } : {},
        },
      },
    },
  };
}
