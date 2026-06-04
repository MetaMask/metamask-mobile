import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import ExtendedKeyringTypes from '../../../app/constants/keyringTypes';
import {
  AccountGroupObject,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { createStateFixture } from '../stateFixture';

export const MULTICHAIN_TEST_ACCOUNTS = {
  account1: {
    id: 'account-1',
    address: '0x1000000000000000000000000000000000000001',
    name: 'Account 1',
  },
  account2: {
    id: 'account-2',
    address: '0x2000000000000000000000000000000000000002',
    name: 'Account 2',
  },
  activityAccount: {
    id: 'account-3',
    address: '0x3000000000000000000000000000000000000003',
    name: 'Account 3',
  },
  secondSrpAccount1: {
    id: 'srp-2-account-1',
    address: '0x4000000000000000000000000000000000000004',
    name: 'Account 1',
  },
  secondSrpAccount2: {
    id: 'srp-2-account-2',
    address: '0x5000000000000000000000000000000000000005',
    name: 'Number 4',
  },
  importedAccount: {
    id: 'imported-account-1',
    address: '0x6000000000000000000000000000000000000006',
    name: 'Account 3',
  },
} as const;

interface BuildMultichainAccountsFixtureOptions {
  includeSecondAccount?: boolean;
  includeActivityAccount?: boolean;
  includeSecondSrp?: boolean;
  includeImportedAccount?: boolean;
}

export interface MultichainAccountsFixture {
  state: DeepPartial<RootState>;
  internalAccounts: Record<string, InternalAccount>;
  groups: {
    account1: AccountGroupObject;
    account2?: AccountGroupObject;
    activityAccount?: AccountGroupObject;
    secondSrpAccount1?: AccountGroupObject;
    secondSrpAccount2?: AccountGroupObject;
    importedAccount?: AccountGroupObject;
  };
  wallets: Record<string, AccountWalletObject>;
}

function createInternalAccount(
  account: (typeof MULTICHAIN_TEST_ACCOUNTS)[keyof typeof MULTICHAIN_TEST_ACCOUNTS],
  keyringType: ExtendedKeyringTypes,
): InternalAccount {
  return {
    id: account.id,
    address: account.address,
    type: 'eip155:eoa',
    scopes: ['eip155:1'],
    options: {},
    methods: ['personal_sign', 'eth_sign', 'eth_signTypedData_v4'],
    metadata: {
      name: account.name,
      keyring: {
        type: keyringType,
      },
      importTime: 1,
      lastSelected: 1,
    },
  };
}

function createAccountGroup(
  id: string,
  name: string,
  accountIds: [string, ...string[]],
): AccountGroupObject {
  return {
    id,
    type:
      accountIds.length > 1
        ? AccountGroupType.MultichainAccount
        : AccountGroupType.SingleAccount,
    accounts: accountIds,
    metadata: {
      name,
      pinned: false,
      hidden: false,
      entropy: {
        groupIndex: 0,
      },
    },
  } as unknown as AccountGroupObject;
}

function createWallet(
  id: string,
  name: string,
  groups: AccountGroupObject[],
  entropyId: string,
): AccountWalletObject {
  return {
    id,
    type: AccountWalletType.Entropy,
    metadata: {
      name,
      entropy: {
        id: entropyId,
      },
    },
    groups: groups.reduce<Record<string, AccountGroupObject>>(
      (groupMap, group) => ({
        ...groupMap,
        [group.id]: group,
      }),
      {},
    ),
  } as unknown as AccountWalletObject;
}

function createImportedWallet(group: AccountGroupObject): AccountWalletObject {
  return {
    id: 'keyring:imported',
    type: AccountWalletType.Keyring,
    metadata: {
      name: 'Imported Accounts',
      keyring: {
        type: ExtendedKeyringTypes.simple,
      },
    },
    groups: {
      [group.id]: group,
    },
  } as unknown as AccountWalletObject;
}

export function buildMultichainAccountsFixture(
  options: BuildMultichainAccountsFixtureOptions = {},
): MultichainAccountsFixture {
  const {
    includeSecondAccount = true,
    includeActivityAccount = false,
    includeSecondSrp = false,
    includeImportedAccount = false,
  } = options;

  const groups: MultichainAccountsFixture['groups'] = {
    account1: createAccountGroup(
      'entropy:wallet1/0',
      MULTICHAIN_TEST_ACCOUNTS.account1.name,
      [MULTICHAIN_TEST_ACCOUNTS.account1.id],
    ),
  };

  const firstWalletGroups = [groups.account1];

  if (includeSecondAccount) {
    groups.account2 = createAccountGroup(
      'entropy:wallet1/1',
      MULTICHAIN_TEST_ACCOUNTS.account2.name,
      [MULTICHAIN_TEST_ACCOUNTS.account2.id],
    );
    firstWalletGroups.push(groups.account2);
  }

  if (includeActivityAccount) {
    groups.activityAccount = createAccountGroup(
      'entropy:wallet1/2',
      MULTICHAIN_TEST_ACCOUNTS.activityAccount.name,
      [MULTICHAIN_TEST_ACCOUNTS.activityAccount.id],
    );
    firstWalletGroups.push(groups.activityAccount);
  }

  const wallets: Record<string, AccountWalletObject> = {
    'entropy:wallet1': createWallet(
      'entropy:wallet1',
      'Wallet 1',
      firstWalletGroups,
      'entropy-source-1',
    ),
  };

  if (includeSecondSrp) {
    groups.secondSrpAccount1 = createAccountGroup(
      'entropy:wallet2/0',
      MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount1.name,
      [MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount1.id],
    );
    groups.secondSrpAccount2 = createAccountGroup(
      'entropy:wallet2/1',
      MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount2.name,
      [MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount2.id],
    );
    wallets['entropy:wallet2'] = createWallet(
      'entropy:wallet2',
      'Wallet 2',
      [groups.secondSrpAccount1, groups.secondSrpAccount2],
      'entropy-source-2',
    );
  }

  if (includeImportedAccount) {
    groups.importedAccount = createAccountGroup(
      'keyring:imported/0',
      MULTICHAIN_TEST_ACCOUNTS.importedAccount.name,
      [MULTICHAIN_TEST_ACCOUNTS.importedAccount.id],
    );
    wallets['keyring:imported'] = createImportedWallet(groups.importedAccount);
  }

  const allGroups = Object.values(groups).filter(
    (group): group is AccountGroupObject => Boolean(group),
  );

  const internalAccounts = allGroups.reduce<Record<string, InternalAccount>>(
    (accounts, group) => {
      const [accountId] = group.accounts;
      const accountSpec = Object.values(MULTICHAIN_TEST_ACCOUNTS).find(
        (account) => account.id === accountId,
      );
      if (!accountSpec) {
        return accounts;
      }

      return {
        ...accounts,
        [accountId]: createInternalAccount(
          accountSpec,
          group.id.startsWith('keyring:')
            ? ExtendedKeyringTypes.simple
            : ExtendedKeyringTypes.hd,
        ),
      };
    },
    {},
  );

  const selectedAccount = MULTICHAIN_TEST_ACCOUNTS.account1.id;

  const state = createStateFixture()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withMinimalAnalyticsController()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalMultichainBalances()
    .withMinimalMultichainAssets()
    .withMinimalTokensController()
    .withPreferences({
      privacyMode: false,
    })
    .withRemoteFeatureFlags({
      enableMultichainAccounts: {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '0.0.0',
      },
      enableMultichainAccountsState2: {
        enabled: true,
        featureVersion: '1',
        minimumVersion: '0.0.0',
      },
    })
    .withOverrides({
      settings: {
        basicFunctionalityEnabled: true,
        privacyMode: false,
      },
      user: {
        seedphraseBackedUp: true,
        ambiguousAddressEntries: {},
      },
      engine: {
        backgroundState: {
          AccountTreeController: {
            accountTree: {
              wallets,
            },
            selectedAccountGroup: groups.account1.id,
          },
          AccountsController: {
            internalAccounts: {
              accounts: internalAccounts,
              selectedAccount,
            },
          },
          KeyringController: {
            isUnlocked: true,
            keyrings: [
              {
                type: ExtendedKeyringTypes.hd,
                accounts: firstWalletGroups.map((group) => {
                  const [accountId] = group.accounts;
                  return internalAccounts[accountId].address;
                }),
                metadata: {
                  id: 'entropy-source-1',
                  name: 'Wallet 1',
                },
              },
              ...(includeSecondSrp
                ? [
                    {
                      type: ExtendedKeyringTypes.hd,
                      accounts: [
                        MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount1.address,
                        MULTICHAIN_TEST_ACCOUNTS.secondSrpAccount2.address,
                      ],
                      metadata: {
                        id: 'entropy-source-2',
                        name: 'Wallet 2',
                      },
                    },
                  ]
                : []),
              ...(includeImportedAccount
                ? [
                    {
                      type: ExtendedKeyringTypes.simple,
                      accounts: [
                        MULTICHAIN_TEST_ACCOUNTS.importedAccount.address,
                      ],
                    },
                  ]
                : []),
            ],
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {
                '0x1': true,
              },
            },
          },
          SeedlessOnboardingController: {},
        },
      },
    } as DeepPartial<RootState>)
    .build();

  return {
    state,
    internalAccounts,
    groups,
    wallets,
  };
}
