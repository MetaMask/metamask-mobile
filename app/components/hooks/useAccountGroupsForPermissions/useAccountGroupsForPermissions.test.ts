import { Caip25CaveatValue } from '@metamask/chain-agnostic-permission';
import { CaipAccountId, CaipChainId, CaipNamespace } from '@metamask/utils';
import { SolAccountType } from '@metamask/keyring-api';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';
import { useAccountGroupsForPermissions } from './useAccountGroupsForPermissions';
import {
  renderHookWithProvider,
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { RootState } from '../../../reducers';
import {
  createMockInternalAccount,
  createMockSnapInternalAccount,
} from '../../../util/test/accountsControllerTestUtils';

const MOCK_WALLET_ID = 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ';
const MOCK_GROUP_ID_1 = 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0';
const MOCK_GROUP_ID_2 = 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1';
const MOCK_SOLANA_CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

// Create mock accounts using utility functions
const mockEvmAccount1 = createMockInternalAccount(
  '0x601Ca13E71aabF3E0A0701d52946476d98cb9b76',
  'EVM Account 1',
);

const mockEvmAccount2 = createMockInternalAccount(
  '0x470D229d889c7BB5a2ea6AEBbb6fF6b077732161',
  'EVM Account 2',
);

const mockSolAccount1 = createMockSnapInternalAccount(
  'EmeSsjxm6V7VBat5FCqdQK4cK7WLstrcScCWyocbhbcd',
  'Solana Account 1',
  SolAccountType.DataAccount,
);

const mockSolAccount2 = createMockSnapInternalAccount(
  '9UkckVyckpAeyZ8GTVtsptULY6vx6LZpocETwVVnLy6Y',
  'Solana Account 2',
  SolAccountType.DataAccount,
);

const createEmptyPermission = (): Caip25CaveatValue => ({
  requiredScopes: {},
  optionalScopes: {},
  sessionProperties: {},
  isMultichainOrigin: false,
});

const createPermissionWithEvmAccounts = (
  addresses: string[],
): Caip25CaveatValue => ({
  requiredScopes: {
    'eip155:1': {
      accounts: addresses.map((addr) => `eip155:1:${addr}` as CaipAccountId),
    },
  },
  optionalScopes: {},
  sessionProperties: {},
  isMultichainOrigin: false,
});

const createMockState = (overrides = {}, accountOverrides = {}) => {
  const accountTreeController = {
    accountTree: {
      selectedAccountGroup: MOCK_GROUP_ID_1,
      wallets: {
        [MOCK_WALLET_ID]: {
          id: MOCK_WALLET_ID,
          type: AccountWalletType.Entropy,
          metadata: {
            name: 'Test Wallet 1',
            entropy: {
              id: '01JKAF3DSGM3AB87EM9N0K41AJ',
            },
          },
          groups: {
            [MOCK_GROUP_ID_1]: {
              id: MOCK_GROUP_ID_1,
              type: AccountGroupType.MultichainAccount,
              metadata: {
                name: 'Test Group 1',
                pinned: false,
                hidden: false,
                entropy: {
                  groupIndex: 0,
                },
              },
              accounts: [mockEvmAccount1.id, mockSolAccount1.id],
            },
            [MOCK_GROUP_ID_2]: {
              id: MOCK_GROUP_ID_2,
              type: AccountGroupType.MultichainAccount,
              metadata: {
                name: 'Test Group 2',
                pinned: false,
                hidden: false,
                entropy: {
                  groupIndex: 1,
                },
              },
              accounts: [mockEvmAccount2.id, mockSolAccount2.id],
            },
          },
        },
      },
    },
    ...overrides,
  };

  const internalAccounts = {
    [mockEvmAccount1.id]: {
      ...mockEvmAccount1,
      scopes: ['eip155:0' as `${string}:${string}`],
    },
    [mockEvmAccount2.id]: {
      ...mockEvmAccount2,
      scopes: ['eip155:0' as `${string}:${string}`],
    },
    [mockSolAccount1.id]: {
      ...mockSolAccount1,
      scopes: [MOCK_SOLANA_CHAIN_ID as `${string}:${string}`],
    },
    [mockSolAccount2.id]: {
      ...mockSolAccount2,
      scopes: [MOCK_SOLANA_CHAIN_ID as `${string}:${string}`],
    },
    ...accountOverrides,
  };

  return {
    engine: {
      backgroundState: {
        AccountTreeController: accountTreeController,
        AccountsController: {
          internalAccounts: {
            accounts: internalAccounts,
          },
        },
        KeyringController: {
          keyrings: [],
        },
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              name: 'Ethereum Mainnet',
            },
          },
        },
        MultichainNetworkController: {
          multichainNetworkConfigurationsByChainId: {
            'eip155:1': {
              chainId: 'eip155:1',
              name: 'Ethereum Mainnet',
              nativeCurrency: 'ETH',
              defaultRpcEndpointIndex: 0,
              rpcEndpoints: [
                {
                  networkClientId: 'mainnet',
                  url: 'https://mainnet.infura.io/v3/',
                  type: 'infura',
                },
              ],
              blockExplorerUrls: ['https://etherscan.io'],
            },
            [MOCK_SOLANA_CHAIN_ID]: {
              chainId: MOCK_SOLANA_CHAIN_ID,
              name: 'Solana Mainnet',
              nativeCurrency: 'SOL',
              defaultRpcEndpointIndex: 0,
              rpcEndpoints: [
                {
                  networkClientId: 'solana-mainnet',
                  url: 'https://api.mainnet-beta.solana.com',
                  type: 'custom',
                },
              ],
              blockExplorerUrls: ['https://explorer.solana.com'],
            },
          },
        },
      },
    },
  };
};

const renderHookWithStore = (
  existingPermission: Caip25CaveatValue,
  requestedCaipAccountIds: CaipAccountId[],
  requestedCaipChainIds: CaipChainId[],
  requestedNamespacesWithoutWallet: CaipNamespace[],
  stateOverrides = {},
  accountOverrides = {},
) => {
  const state = createMockState(stateOverrides, accountOverrides);

  return renderHookWithProvider(
    () =>
      useAccountGroupsForPermissions(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      ),
    { state: state as DeepPartial<RootState> },
  );
};

describe('useAccountGroupsForPermissions', () => {
  describe('when no existing permissions', () => {
    it('returns empty connected account groups with available supported groups', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.connectedAccountGroups).toEqual([]);
      expect(result.current.supportedAccountGroups).toHaveLength(2);
      expect(result.current.existingConnectedCaipAccountIds).toEqual([]);
    });
  });

  describe('when existing EVM permissions exist', () => {
    it('returns connected account groups for existing EVM accounts', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.connectedAccountGroups).toHaveLength(1);
      expect(result.current.connectedAccountGroups[0].id).toBe(MOCK_GROUP_ID_1);
      expect(result.current.supportedAccountGroups).toHaveLength(2);
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
      ]);
    });
  });

  describe('EVM wildcard handling', () => {
    it('converts EVM chain IDs to wildcard format for deduplication', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
        'eip155:10' as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toHaveLength(2);
    });
  });

  describe('supportedAccountGroups when no chain IDs provided', () => {
    it('returns empty array when no namespaces are requested', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toEqual([]);
    });

    it('filters account groups by requested namespaces when no chain IDs provided', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [
        'solana' as CaipNamespace,
      ];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toHaveLength(2);
    });

    it('handles multiple matching namespaces', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [
        'eip155' as CaipNamespace,
        'solana' as CaipNamespace,
      ];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('handles malformed CAIP account IDs', () => {
      const malformedPermission: Caip25CaveatValue = {
        requiredScopes: {
          'eip155:1': {
            accounts: [
              'invalid-caip-account-id' as CaipAccountId,
              `eip155:1:${mockEvmAccount1.address}` as CaipAccountId,
            ],
          },
        },
        optionalScopes: {},
        sessionProperties: {},
        isMultichainOrigin: false,
      };

      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        malformedPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        'invalid-caip-account-id',
        `eip155:1:${mockEvmAccount1.address}`,
      ]);
    });

    it('handles missing account groups gracefully', () => {
      const stateOverrides = {
        accountTree: {
          selectedAccountGroup: MOCK_GROUP_ID_1,
          wallets: {},
        },
      };

      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
        stateOverrides,
      );

      expect(result.current.connectedAccountGroups).toEqual([]);
    });
  });

  describe('mixed namespace and chain scenarios', () => {
    it('handles mixed EVM and non-EVM chain requests', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
        'solana:mainnet' as CaipChainId,
        'bip122:000000000019d6689c085ae165831e93' as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toHaveLength(2);
    });

    it('handles non-EVM existing permissions', () => {
      const solPermission: Caip25CaveatValue = {
        requiredScopes: {
          [MOCK_SOLANA_CHAIN_ID]: {
            accounts: [
              `${MOCK_SOLANA_CHAIN_ID}:${mockSolAccount1.address}` as CaipAccountId,
            ],
          },
        },
        optionalScopes: {},
        sessionProperties: {},
        isMultichainOrigin: false,
      };

      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        MOCK_SOLANA_CHAIN_ID as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        solPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.connectedAccountGroups).toHaveLength(1);
      expect(result.current.connectedAccountGroups[0].id).toBe(MOCK_GROUP_ID_1);
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `${MOCK_SOLANA_CHAIN_ID}:${mockSolAccount1.address}`,
      ]);
    });
  });

  it('handles empty permission scopes', () => {
    const emptyPermission = createEmptyPermission();
    const requestedCaipAccountIds: CaipAccountId[] = [];
    const requestedCaipChainIds: CaipChainId[] = [];
    const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

    const { result } = renderHookWithStore(
      emptyPermission,
      requestedCaipAccountIds,
      requestedCaipChainIds,
      requestedNamespacesWithoutWallet,
    );

    expect(result.current.connectedAccountGroups).toEqual([]);
    expect(result.current.supportedAccountGroups).toEqual([]);
    expect(result.current.existingConnectedCaipAccountIds).toEqual([]);
  });

  it('handles permission with empty account arrays', () => {
    const emptyAccountsPermission: Caip25CaveatValue = {
      requiredScopes: {
        'eip155:1': {
          accounts: [],
        },
      },
      optionalScopes: {},
      sessionProperties: {},
      isMultichainOrigin: false,
    };

    const requestedCaipAccountIds: CaipAccountId[] = [];
    const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
    const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

    const { result } = renderHookWithStore(
      emptyAccountsPermission,
      requestedCaipAccountIds,
      requestedCaipChainIds,
      requestedNamespacesWithoutWallet,
    );

    expect(result.current.connectedAccountGroups).toEqual([]);
    expect(result.current.existingConnectedCaipAccountIds).toEqual([]);
  });

  it('handles accounts with no scopes when filtering by namespace', () => {
    const accountOverrides = {
      [mockEvmAccount1.id]: {
        ...mockEvmAccount1,
        scopes: [],
      },
      [mockEvmAccount2.id]: {
        ...mockEvmAccount2,
        scopes: [],
      },
      [mockSolAccount1.id]: {
        ...mockSolAccount1,
        scopes: [],
      },
      [mockSolAccount2.id]: {
        ...mockSolAccount2,
        scopes: [],
      },
    };

    const emptyPermission = createEmptyPermission();
    const requestedCaipAccountIds: CaipAccountId[] = [];
    const requestedCaipChainIds: CaipChainId[] = [];
    const requestedNamespacesWithoutWallet: CaipNamespace[] = [
      'eip155' as CaipNamespace,
    ];

    const { result } = renderHookWithStore(
      emptyPermission,
      requestedCaipAccountIds,
      requestedCaipChainIds,
      requestedNamespacesWithoutWallet,
      {},
      accountOverrides,
    );

    expect(result.current.supportedAccountGroups).toEqual([]);
  });

  describe('requestedCaipAccountIds prioritization', () => {
    it('prioritizes account groups that fulfill requested account IDs in connected groups', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
        mockEvmAccount2.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [
        `eip155:1:${mockEvmAccount2.address}` as CaipAccountId,
      ];
      const requestedCaipChainIds: CaipChainId[] = [];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.connectedAccountGroups).toHaveLength(2);
      // Group 2 should be first because it fulfills the requested account ID
      expect(result.current.connectedAccountGroups[0].id).toBe(MOCK_GROUP_ID_2);
      expect(result.current.connectedAccountGroups[1].id).toBe(MOCK_GROUP_ID_1);
    });

    it('prioritizes account groups that fulfill requested account IDs in supported groups', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [
        `eip155:1:${mockEvmAccount2.address}` as CaipAccountId,
      ];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toHaveLength(2);
      // Group 2 should be first because it fulfills the requested account ID
      expect(result.current.supportedAccountGroups[0].id).toBe(MOCK_GROUP_ID_2);
      expect(result.current.supportedAccountGroups[1].id).toBe(MOCK_GROUP_ID_1);
    });

    it('includes groups with requested account IDs even if they do not support requested chains', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [
        `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:${mockSolAccount1.address}` as CaipAccountId,
      ];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toHaveLength(2);
      // Group 1 should be first because it fulfills the requested account ID (even though it doesn't support eip155:1)
      expect(result.current.supportedAccountGroups[0].id).toBe(MOCK_GROUP_ID_1);
    });

    it('handles multiple requested account IDs from different groups', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [
        `eip155:1:${mockEvmAccount1.address}` as CaipAccountId,
        `eip155:1:${mockEvmAccount2.address}` as CaipAccountId,
      ];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.supportedAccountGroups).toHaveLength(2);
      // Both groups should be present since both fulfill requested account IDs
      const groupIds = result.current.supportedAccountGroups.map(
        (group) => group.id,
      );
      expect(groupIds).toContain(MOCK_GROUP_ID_1);
      expect(groupIds).toContain(MOCK_GROUP_ID_2);
    });
  });

  describe('new chains requested scenarios', () => {
    it('updates connected CAIP account IDs when new chains are requested', () => {
      // Given existing permission on eip155:1
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      // When requesting a new chain (eip155:137) that wasn't in existing permissions
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId, // New chain
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      // Then updated connected account IDs should include accounts for both chains
      expect(result.current.updatedCaipAccountIdsToConnect).toContain(
        `eip155:1:${mockEvmAccount1.address}`,
      );
      expect(result.current.updatedCaipAccountIdsToConnect).toContain(
        `eip155:137:${mockEvmAccount1.address}`,
      );
      expect(result.current.connectedAccountGroups).toHaveLength(1);
      // Should indicate that new chains were requested
      expect(result.current.hasNewChainsRequested).toBe(true);
      // existingConnectedCaipAccountIds should contain the existing connected account IDs
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
      ]);
    });

    it('does not update connected CAIP account IDs when no new chains are requested', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = ['eip155:1' as CaipChainId];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.updatedCaipAccountIdsToConnect).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
      ]);
      expect(result.current.connectedAccountGroups).toHaveLength(1);
      // Should indicate that no new chains were requested
      expect(result.current.hasNewChainsRequested).toBe(false);
      // existingConnectedCaipAccountIds should contain the existing connected account IDs
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
      ]);
    });

    it('handles multiple new chains with existing permissions', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
        mockEvmAccount2.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId, // Existing
        'eip155:137' as CaipChainId, // New - Polygon
        'eip155:10' as CaipChainId, // New - Optimism
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      const connectedAccountIds = result.current.updatedCaipAccountIdsToConnect;
      expect(connectedAccountIds).toContain(
        `eip155:1:${mockEvmAccount1.address}`,
      );
      expect(connectedAccountIds).toContain(
        `eip155:137:${mockEvmAccount1.address}`,
      );
      expect(connectedAccountIds).toContain(
        `eip155:10:${mockEvmAccount1.address}`,
      );
      expect(connectedAccountIds).toContain(
        `eip155:1:${mockEvmAccount2.address}`,
      );
      expect(connectedAccountIds).toContain(
        `eip155:137:${mockEvmAccount2.address}`,
      );
      expect(connectedAccountIds).toContain(
        `eip155:10:${mockEvmAccount2.address}`,
      );
      // Should indicate that new chains were requested
      expect(result.current.hasNewChainsRequested).toBe(true);
      // existingConnectedCaipAccountIds should contain the existing connected account IDs
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
        `eip155:1:${mockEvmAccount2.address}`,
      ]);
    });

    it('handles new non-EVM chains with existing EVM permissions', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        MOCK_SOLANA_CHAIN_ID as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.updatedCaipAccountIdsToConnect).toContain(
        `${MOCK_SOLANA_CHAIN_ID}:${mockSolAccount1.address}`,
      );
      expect(result.current.connectedAccountGroups).toHaveLength(1);
      // Should indicate that new chains were requested
      expect(result.current.hasNewChainsRequested).toBe(true);
      // existingConnectedCaipAccountIds should contain the existing connected account IDs
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
      ]);
    });

    it('handles mixed existing and new chains correctly', () => {
      const mixedPermission: Caip25CaveatValue = {
        requiredScopes: {
          'eip155:1': {
            accounts: [`eip155:1:${mockEvmAccount1.address}` as CaipAccountId],
          },
          [MOCK_SOLANA_CHAIN_ID]: {
            accounts: [
              `${MOCK_SOLANA_CHAIN_ID}:${mockSolAccount1.address}` as CaipAccountId,
            ],
          },
        },
        optionalScopes: {},
        sessionProperties: {},
        isMultichainOrigin: false,
      };

      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        mixedPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.updatedCaipAccountIdsToConnect).toContain(
        `eip155:1:${mockEvmAccount1.address}`,
      );
      expect(result.current.updatedCaipAccountIdsToConnect).toContain(
        `eip155:137:${mockEvmAccount1.address}`,
      );
      expect(result.current.updatedCaipAccountIdsToConnect).not.toContain(
        `${MOCK_SOLANA_CHAIN_ID}:${mockSolAccount1.address}`,
      );
      // Should indicate that new chains were requested (eip155:137 is new)
      expect(result.current.hasNewChainsRequested).toBe(true);
      // existingConnectedCaipAccountIds should contain the existing connected account IDs
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
        `${MOCK_SOLANA_CHAIN_ID}:${mockSolAccount1.address}`,
      ]);
    });

    it('handles empty connected groups when requesting new chains', () => {
      const emptyPermission = createEmptyPermission();
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.updatedCaipAccountIdsToConnect).toEqual([]);
      expect(result.current.connectedAccountGroups).toEqual([]);
      expect(result.current.supportedAccountGroups).toHaveLength(2);
      // Should indicate that new chains were requested (all chains are new when no existing permissions)
      expect(result.current.hasNewChainsRequested).toBe(true);
      // existingConnectedCaipAccountIds should be empty when no existing permissions
      expect(result.current.existingConnectedCaipAccountIds).toEqual([]);
    });

    it('handles new chains with requested account IDs prioritization', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      // Request specific account from group 2
      const requestedCaipAccountIds: CaipAccountId[] = [
        `eip155:137:${mockEvmAccount2.address}` as CaipAccountId,
      ];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId, // Existing
        'eip155:137' as CaipChainId, // New
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      const updatedAccountIds = result.current.updatedCaipAccountIdsToConnect;
      expect(updatedAccountIds).toContain(
        `eip155:137:${mockEvmAccount2.address}`,
      );
      expect(updatedAccountIds).toContain(
        `eip155:1:${mockEvmAccount1.address}`,
      );
      expect(updatedAccountIds).toContain(
        `eip155:137:${mockEvmAccount1.address}`,
      );
      expect(result.current.hasNewChainsRequested).toBe(true);
    });

    it('handles new chains when existing permission has empty accounts', () => {
      const emptyAccountsPermission: Caip25CaveatValue = {
        requiredScopes: {
          'eip155:1': {
            accounts: [],
          },
        },
        optionalScopes: {},
        sessionProperties: {},
        isMultichainOrigin: false,
      };

      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        emptyAccountsPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      expect(result.current.updatedCaipAccountIdsToConnect).toEqual([]);
      expect(result.current.connectedAccountGroups).toEqual([]);
      expect(result.current.hasNewChainsRequested).toBe(true);
    });

    it('handles new chains with optionalScopes in existing permissions', () => {
      const permissionWithOptionalScopes: Caip25CaveatValue = {
        requiredScopes: {
          'eip155:1': {
            accounts: [`eip155:1:${mockEvmAccount1.address}` as CaipAccountId],
          },
        },
        optionalScopes: {
          'eip155:137': {
            accounts: [
              `eip155:137:${mockEvmAccount2.address}` as CaipAccountId,
            ],
          },
        },
        sessionProperties: {},
        isMultichainOrigin: false,
      };

      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:10' as CaipChainId, // New chain
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        permissionWithOptionalScopes,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      const updatedAccountIds = result.current.updatedCaipAccountIdsToConnect;
      expect(updatedAccountIds).toContain(
        `eip155:1:${mockEvmAccount1.address}`,
      );
      expect(updatedAccountIds).toContain(
        `eip155:10:${mockEvmAccount1.address}`,
      );
      expect(result.current.hasNewChainsRequested).toBe(true);
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
        `eip155:137:${mockEvmAccount2.address}`,
      ]);
    });

    it('handles new chains with duplicate chain IDs in request', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
        'eip155:137' as CaipChainId, // Duplicate
        'eip155:10' as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      const updatedAccountIds = result.current.updatedCaipAccountIdsToConnect;
      // Should not have duplicate account IDs
      const uniqueAccountIds = [...new Set(updatedAccountIds)];
      expect(updatedAccountIds).toHaveLength(uniqueAccountIds.length);
      expect(result.current.hasNewChainsRequested).toBe(true);
    });

    it('handles new chains with very large number of chains', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      // Create many new chain IDs
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId, // Existing
        ...Array.from(
          { length: 20 },
          (_, i) => `eip155:${i + 100}` as CaipChainId,
        ),
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      const updatedAccountIds = result.current.updatedCaipAccountIdsToConnect;
      // Should have 21 account IDs (1 existing + 20 new chains)
      expect(updatedAccountIds).toHaveLength(21);
      expect(result.current.hasNewChainsRequested).toBe(true);
    });

    it('handles new chains when no account groups support the chains', () => {
      // Create state with account groups that have no accounts
      const stateOverrides = {
        accountTree: {
          selectedAccountGroup: MOCK_GROUP_ID_1,
          wallets: {
            [MOCK_WALLET_ID]: {
              id: MOCK_WALLET_ID,
              type: AccountWalletType.Entropy,
              metadata: {
                name: 'Test Wallet 1',
                entropy: {
                  id: '01JKAF3DSGM3AB87EM9N0K41AJ',
                },
              },
              groups: {
                [MOCK_GROUP_ID_1]: {
                  id: MOCK_GROUP_ID_1,
                  type: AccountGroupType.MultichainAccount,
                  metadata: {
                    name: 'Empty Group',
                    pinned: false,
                    hidden: false,
                    entropy: {
                      groupIndex: 0,
                    },
                  },
                  accounts: [],
                },
              },
            },
          },
        },
      };

      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'eip155:1' as CaipChainId,
        'eip155:137' as CaipChainId,
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
        stateOverrides,
      );

      expect(result.current.updatedCaipAccountIdsToConnect).toEqual([]);
      expect(result.current.connectedAccountGroups).toEqual([]);
      expect(result.current.hasNewChainsRequested).toBe(true);
    });

    it('preserves existing connected account IDs when no new chains match existing namespaces', () => {
      const existingPermission = createPermissionWithEvmAccounts([
        mockEvmAccount1.address,
      ]);
      const requestedCaipAccountIds: CaipAccountId[] = [];
      const requestedCaipChainIds: CaipChainId[] = [
        'bip122:000000000019d6689c085ae165831e93' as CaipChainId, // Bitcoin - different namespace
      ];
      const requestedNamespacesWithoutWallet: CaipNamespace[] = [];

      const { result } = renderHookWithStore(
        existingPermission,
        requestedCaipAccountIds,
        requestedCaipChainIds,
        requestedNamespacesWithoutWallet,
      );

      // Should not include any Bitcoin accounts since no accounts support Bitcoin
      expect(result.current.updatedCaipAccountIdsToConnect).toEqual([]);
      expect(result.current.hasNewChainsRequested).toBe(true);
      expect(result.current.existingConnectedCaipAccountIds).toEqual([
        `eip155:1:${mockEvmAccount1.address}`,
      ]);
    });
  });
});
