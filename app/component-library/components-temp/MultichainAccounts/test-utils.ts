import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { AccountWalletType, AccountGroupType } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { RootState } from '../../../reducers';
import { backgroundState } from '../../../util/test/initial-root-state';

/**
 * Creates a mock internal account for testing
 */
export const createMockInternalAccount = (
  id: string,
  address: string,
  name: string,
): InternalAccount => ({
  id,
  address,
  type: 'eip155:eoa',
  scopes: ['eip155:1'],
  options: {},
  methods: ['personal_sign', 'eth_sign', 'eth_signTypedData_v4'],
  metadata: {
    name,
    keyring: {
      type: ExtendedKeyringTypes.simple,
    },
    importTime: Date.now(),
  },
});

/**
 * Creates a mock account group for testing
 */
export const createMockAccountGroup = (
  id: string,
  name: string,
  accounts: string[] = [`account-${id}`],
): AccountGroupObject => {
  if (accounts.length === 1) {
    const group = {
      id: id as AccountGroupObject['id'],
      type: AccountGroupType.SingleAccount,
      accounts: [accounts[0]] as [string],
      metadata: {
        name,
        pinned: false,
        hidden: false,
      },
    };
    return group as unknown as AccountGroupObject;
  }

  const group = {
    id: id as AccountGroupObject['id'],
    type: AccountGroupType.MultichainAccount,
    accounts: accounts as [string, ...string[]],
    metadata: {
      name,
      pinned: false,
      hidden: false,
      entropy: {
        groupIndex: 0,
      },
    },
  };
  return group as unknown as AccountGroupObject;
};

/**
 * Creates a mock wallet for testing
 */
export const createMockWallet = (
  id: string,
  name: string,
  groups: AccountGroupObject[],
): AccountWalletObject => {
  const wallet = {
    id: id as AccountWalletObject['id'],
    type: AccountWalletType.Keyring,
    metadata: {
      name,
      keyring: {
        type: ExtendedKeyringTypes.simple,
      },
    },
    groups: groups.reduce((acc, group) => {
      acc[group.id] = group;
      return acc;
    }, {} as Record<string, AccountGroupObject>),
  };

  return wallet as unknown as AccountWalletObject;
};

/**
 * Creates mock state with accounts and internal accounts
 */
export const createMockState = (
  wallets: AccountWalletObject[],
  internalAccounts: Record<string, InternalAccount>,
): RootState => {
  const walletMap = wallets.reduce((acc, wallet) => {
    acc[`keyring:${wallet.id}`] = wallet;
    return acc;
  }, {} as Record<string, AccountWalletObject>);

  return {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountTreeController: {
          accountTree: {
            wallets: walletMap,
          },
        },
        AccountsController: {
          internalAccounts: {
            accounts: internalAccounts,
            selectedAccount: Object.keys(internalAccounts)[0],
          },
        },
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            enableMultichainAccounts: {
              enabled: true,
              featureVersion: '1',
              minimumVersion: '1.0.0',
            },
          },
        },
      },
    },
  } as unknown as RootState;
};

/**
 * Creates mock internal accounts from account groups
 */
export const createMockInternalAccountsFromGroups = (
  accountGroups: AccountGroupObject[],
): Record<string, InternalAccount> => {
  const internalAccounts: Record<string, InternalAccount> = {};

  accountGroups.forEach((group, groupIndex) => {
    group.accounts.forEach((accountId, accountIndex) => {
      internalAccounts[accountId] = createMockInternalAccount(
        accountId,
        `0x${(groupIndex + 1).toString().padStart(4, '0')}${(accountIndex + 1)
          .toString()
          .padStart(4, '0')}${accountId.slice(-8)}`,
        group.metadata.name,
      );
    });
  });

  return internalAccounts;
};

/**
 * Creates mock internal accounts with custom addresses
 */
export const createMockInternalAccountsWithAddresses = (
  accountGroups: AccountGroupObject[],
  addresses: Record<string, string>,
): Record<string, InternalAccount> => {
  const internalAccounts: Record<string, InternalAccount> = {};

  accountGroups.forEach((group) => {
    group.accounts.forEach((accountId) => {
      const address = addresses[accountId] || `0x${accountId.slice(-8)}`;
      internalAccounts[accountId] = createMockInternalAccount(
        accountId,
        address,
        group.metadata.name,
      );
    });
  });

  return internalAccounts;
};
