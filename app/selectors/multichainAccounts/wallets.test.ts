import {
  selectFirstEntropyWalletAccountGroups,
  selectMultichainWallets,
  selectWallets,
} from './wallets';
import { RootState } from '../../reducers';
import {
  AccountGroupObject,
  AccountTreeControllerState,
  AccountWalletObject,
} from '@metamask/account-tree-controller';
import { DeepPartial } from 'redux';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';
import { KeyringTypes } from '@metamask/keyring-controller';

// Mock KeyringTypes since it's not available in tests
const mockKeyringTypes = {
  HD_KEY_TREE: 'HD Key Tree' as KeyringTypes,
};

const WALLET_ID_1 = 'keyring:wallet1' as const;
const WALLET_ID_2 = 'keyring:wallet2' as const;
const MULTICHAIN_WALLET_ID_1 = 'entropy:wallet1' as const;
const MULTICHAIN_WALLET_ID_2 = 'entropy:wallet2' as const;
const GROUP_ID_1 = 'keyring:wallet1/0' as const;
const GROUP_ID_2 = 'keyring:wallet2/1' as const;

/**
 * Helper function to create a base mock state with RemoteFeatureFlagController
 */
const createMockState = (
  accountTreeController:
    | DeepPartial<AccountTreeControllerState>
    | undefined = {},
): RootState =>
  ({
    engine: {
      backgroundState: {
        AccountTreeController: accountTreeController,
      },
    },
  }) as unknown as RootState;

describe('selectWallets', () => {
  it('returns wallets array when multichain accounts feature is enabled and wallets exist', () => {
    const wallet1: AccountWalletObject = {
      id: WALLET_ID_1,
      type: AccountWalletType.Keyring,
      status: 'ready',
      groups: {
        [GROUP_ID_1]: {
          accounts: ['account1' as const],
          id: GROUP_ID_1,
          type: AccountGroupType.SingleAccount,
          metadata: {
            name: 'Account 1',
            pinned: false,
            hidden: false,
            lastSelected: 0,
          },
        },
      },
      metadata: {
        name: 'Wallet 1',
        keyring: {
          type: mockKeyringTypes.HD_KEY_TREE,
        },
      },
    };

    const wallet2: AccountWalletObject = {
      id: WALLET_ID_2,
      type: AccountWalletType.Keyring,
      status: 'ready',
      groups: {
        [GROUP_ID_2]: {
          accounts: ['account2' as const],
          id: GROUP_ID_2,
          type: AccountGroupType.SingleAccount,
          metadata: {
            name: 'Account 2',
            pinned: false,
            hidden: false,
            lastSelected: 0,
          },
        },
      },
      metadata: {
        name: 'Wallet 2',
        keyring: {
          type: mockKeyringTypes.HD_KEY_TREE,
        },
      },
    };

    const walletMetadata = {
      [WALLET_ID_1]: {
        name: { value: 'Wallet 1', lastUpdatedAt: expect.any(Number) },
      },
      [WALLET_ID_2]: {
        name: { value: 'Wallet 2', lastUpdatedAt: expect.any(Number) },
      },
    };

    const groupMetadata = {
      [GROUP_ID_1]: {
        name: { value: 'Account 1', lastUpdatedAt: expect.any(Number) },
      },
      [GROUP_ID_2]: {
        name: { value: 'Account 2', lastUpdatedAt: expect.any(Number) },
      },
    };

    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: wallet1,
          [WALLET_ID_2]: wallet2,
        },
      },
      selectedAccountGroup: '',
      accountGroupsMetadata: groupMetadata,
      accountWalletsMetadata: walletMetadata,
    });

    const result = selectWallets(mockState);
    expect(result).toEqual([wallet1, wallet2]);
  });

  it('returns empty array when multichain accounts feature is enabled but no wallets exist', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {},
      },
    });

    const result = selectWallets(mockState);
    expect(result).toEqual([]);
  });

  it('returns empty array when accountTree is undefined', () => {
    const mockState = createMockState(undefined);
    const result = selectWallets(mockState);
    expect(result).toEqual([]);
  });

  it('handles wallets with empty groups', () => {
    const walletWithEmptyGroups: AccountWalletObject = {
      id: WALLET_ID_1,
      type: AccountWalletType.Keyring,
      status: 'ready',
      metadata: {
        name: 'Empty Groups Wallet',
        keyring: {
          type: mockKeyringTypes.HD_KEY_TREE,
        },
      },
      groups: {},
    };

    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: walletWithEmptyGroups,
        },
      },
    });

    const result = selectWallets(mockState);
    expect(result).toEqual([walletWithEmptyGroups]);
    expect(result[0].groups).toEqual({});
  });
});

describe('selectMultichainWallets', () => {
  it('returns multichain wallets when multichain accounts feature is enabled and multichain wallets exist', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {
          [MULTICHAIN_WALLET_ID_1]: {
            id: MULTICHAIN_WALLET_ID_1,
            type: AccountWalletType.Entropy,
            status: 'ready',
            metadata: {
              name: 'Multichain Wallet 1',
              entropy: {
                id: 'entropy1',
              },
            },
            groups: {},
          },
          [MULTICHAIN_WALLET_ID_2]: {
            id: MULTICHAIN_WALLET_ID_2,
            type: AccountWalletType.Entropy,
            status: 'ready',
            metadata: {
              name: 'Multichain Wallet 2',
              entropy: {
                id: 'entropy2',
              },
            },
            groups: {},
          },
          [WALLET_ID_1]: {
            id: WALLET_ID_1,
            type: AccountWalletType.Keyring,
            status: 'ready',
            metadata: {
              name: 'Wallet 1',
              keyring: {
                type: mockKeyringTypes.HD_KEY_TREE,
              },
            },
            groups: {},
          },
          [WALLET_ID_2]: {
            id: WALLET_ID_2,
            type: AccountWalletType.Keyring,
            status: 'ready',
            metadata: {
              name: 'Wallet 2',
              keyring: {
                type: mockKeyringTypes.HD_KEY_TREE,
              },
            },
            groups: {},
          },
        },
      },
      selectedAccountGroup: '',
    });
    const result = selectMultichainWallets(mockState);
    expect(result).toEqual([
      {
        id: MULTICHAIN_WALLET_ID_1,
        type: AccountWalletType.Entropy,
        status: 'ready',
        metadata: {
          name: 'Multichain Wallet 1',
          entropy: {
            id: 'entropy1',
          },
        },
        groups: {},
      },
      {
        id: MULTICHAIN_WALLET_ID_2,
        type: AccountWalletType.Entropy,
        status: 'ready',
        metadata: {
          name: 'Multichain Wallet 2',
          entropy: {
            id: 'entropy2',
          },
        },
        groups: {},
      },
    ]);
  });
});

describe('selectFirstEntropyWalletAccountGroups', () => {
  const GROUP_A = 'entropy:wallet1/0' as const;
  const GROUP_B = 'entropy:wallet1/1' as const;
  const GROUP_C = 'entropy:wallet2/0' as const;

  const buildGroup = (id: string, name: string) =>
    ({
      id,
      type: AccountGroupType.SingleAccount,
      accounts: ['account1' as const],
      metadata: { name, pinned: false, hidden: false, lastSelected: 0 },
    }) as unknown as AccountGroupObject;

  const buildEntropyWallet = (
    id: string,
    name: string,
    groups: Record<string, AccountGroupObject>,
  ) =>
    ({
      id,
      type: AccountWalletType.Entropy,
      status: 'ready',
      metadata: { name, entropy: { id: name } },
      groups,
    }) as unknown as AccountWalletObject;

  it('returns the groups of the first entropy wallet only', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {
          [MULTICHAIN_WALLET_ID_1]: buildEntropyWallet(
            MULTICHAIN_WALLET_ID_1,
            'Wallet 1',
            {
              [GROUP_A]: buildGroup(GROUP_A, 'Account 1'),
              [GROUP_B]: buildGroup(GROUP_B, 'Account 2'),
            },
          ),
          [MULTICHAIN_WALLET_ID_2]: buildEntropyWallet(
            MULTICHAIN_WALLET_ID_2,
            'Wallet 2',
            { [GROUP_C]: buildGroup(GROUP_C, 'Account 3') },
          ),
        },
      },
      selectedAccountGroup: '',
    });

    const result = selectFirstEntropyWalletAccountGroups(mockState);

    expect(result.map((group) => group.id)).toEqual([GROUP_A, GROUP_B]);
  });

  it('skips non-entropy wallets when picking the first wallet', () => {
    const mockState = createMockState({
      accountTree: {
        wallets: {
          [WALLET_ID_1]: {
            id: WALLET_ID_1,
            type: AccountWalletType.Keyring,
            status: 'ready',
            metadata: {
              name: 'Imported',
              keyring: { type: mockKeyringTypes.HD_KEY_TREE },
            },
            groups: { [GROUP_C]: buildGroup(GROUP_C, 'Imported account') },
          } as unknown as AccountWalletObject,
          [MULTICHAIN_WALLET_ID_1]: buildEntropyWallet(
            MULTICHAIN_WALLET_ID_1,
            'Wallet 1',
            { [GROUP_A]: buildGroup(GROUP_A, 'Account 1') },
          ),
        },
      },
      selectedAccountGroup: '',
    });

    const result = selectFirstEntropyWalletAccountGroups(mockState);

    expect(result.map((group) => group.id)).toEqual([GROUP_A]);
  });

  it('returns an empty array when no entropy wallet exists', () => {
    const mockState = createMockState({ accountTree: { wallets: {} } });

    expect(selectFirstEntropyWalletAccountGroups(mockState)).toEqual([]);
  });
});
