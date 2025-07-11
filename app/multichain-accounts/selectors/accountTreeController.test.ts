import {
  selectAccountSections,
  selectWalletById,
} from './accountTreeController';
import { RootState } from '../../reducers';

const WALLET_ID_1 = 'keyring:wallet1';
const WALLET_ID_2 = 'keyring:wallet2';
const WALLET_ID_A = 'keyring:wallet-a';
const WALLET_ID_B = 'keyring:wallet-b';
const WALLET_ID_NONEXISTENT = 'keyring:nonexistent';
const WALLET_ID_WITH_GROUPS = 'keyring:wallet-with-groups';
const WALLET_ID_EMPTY = 'keyring:empty-wallet';

describe('AccountTreeController Selectors', () => {
  describe('selectAccountSections', () => {
    it('returns null when accountTree is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: undefined,
          },
        },
      } as unknown as RootState;

      const result = selectAccountSections(mockState);
      expect(result).toEqual(null);
    });

    it('returns null when accountTree.wallets is null', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: null,
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectAccountSections(mockState);
      expect(result).toEqual(null);
    });

    it('returns wallet sections with accounts when wallets exist', () => {
      const mockAccounts = [
        { id: 'account1', address: '0x123', name: 'Account 1' },
        { id: 'account2', address: '0x456', name: 'Account 2' },
      ];

      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  [WALLET_ID_1]: {
                    metadata: {
                      name: 'Wallet 1',
                    },
                    groups: {
                      group1: {
                        accounts: [mockAccounts[0]],
                      },
                      group2: {
                        accounts: [mockAccounts[1]],
                      },
                    },
                  },
                  [WALLET_ID_2]: {
                    metadata: {
                      name: 'Wallet 2',
                    },
                    groups: {
                      group3: {
                        accounts: [],
                      },
                    },
                  },
                },
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

      const result = selectAccountSections(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          wallet: {
            groups: {
              group1: {
                accounts: [
                  {
                    address: '0x123',
                    id: 'account1',
                    name: 'Account 1',
                  },
                ],
              },
              group2: {
                accounts: [
                  {
                    address: '0x456',
                    id: 'account2',
                    name: 'Account 2',
                  },
                ],
              },
            },
            metadata: {
              name: 'Wallet 1',
            },
          },
          data: mockAccounts,
        },
        {
          title: 'Wallet 2',
          wallet: {
            groups: {
              group3: {
                accounts: [],
              },
            },
            metadata: {
              name: 'Wallet 2',
            },
          },
          data: [],
        },
      ]);
    });

    it('returns null when wallets is empty', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {},
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectAccountSections(mockState);
      expect(result).toEqual(null);
    });
  });

  describe('selectWalletById', () => {
    it('returns null when accountTree is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: undefined,
          },
        },
      } as unknown as RootState;

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(null);
    });

    it('returns null when multichain accounts feature is disabled', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  [WALLET_ID_1]: {
                    id: WALLET_ID_1,
                    metadata: { name: 'Wallet 1' },
                    groups: {},
                  },
                },
              },
            },
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                enableMultichainAccounts: {
                  enabled: false,
                  featureVersion: '1',
                  minimumVersion: '1.0.0',
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(null);
    });

    it('returns wallet when found by ID', () => {
      const mockWallet = {
        id: WALLET_ID_1,
        metadata: { name: 'Wallet 1' },
        groups: {
          group1: {
            accounts: [{ id: 'account1', address: '0x123', name: 'Account 1' }],
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  [WALLET_ID_1]: mockWallet,
                  [WALLET_ID_2]: {
                    id: WALLET_ID_2,
                    metadata: { name: 'Wallet 2' },
                    groups: {},
                  },
                },
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

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(mockWallet);
    });

    it('returns null when wallet ID is not found', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  [WALLET_ID_1]: {
                    id: WALLET_ID_1,
                    metadata: { name: 'Wallet 1' },
                    groups: {},
                  },
                },
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

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_NONEXISTENT);
      expect(result).toEqual(null);
    });

    it('returns null when wallets is null', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: null,
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

      const selector = selectWalletById(mockState);
      const result = selector(WALLET_ID_1);
      expect(result).toEqual(null);
    });

    it('returns correct wallet when multiple wallets exist', () => {
      const mockWallet1 = {
        id: WALLET_ID_1,
        metadata: { name: 'First Wallet' },
        groups: {
          'keyring:1:ethereum': {
            accounts: [{ id: 'eth1', address: '0x123', name: 'ETH Account 1' }],
          },
        },
      };

      const mockWallet2 = {
        id: WALLET_ID_2,
        metadata: { name: 'Second Wallet' },
        groups: {
          'snap:solana:mainnet': {
            accounts: [
              { id: 'sol1', address: 'sol123', name: 'SOL Account 1' },
            ],
          },
        },
      };

      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  [WALLET_ID_1]: mockWallet1,
                  [WALLET_ID_2]: mockWallet2,
                },
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

      const selector = selectWalletById(mockState);

      // Test retrieving first wallet
      const result1 = selector(WALLET_ID_1);
      expect(result1).toEqual(mockWallet1);

      // Test retrieving second wallet
      const result2 = selector(WALLET_ID_2);
      expect(result2).toEqual(mockWallet2);
    });

    it('returns wallet with metadata and various group structures', () => {
      const mockWalletWithGroups = {
        id: WALLET_ID_WITH_GROUPS,
        metadata: { name: 'Test Wallet with Groups' },
        groups: {
          'keyring:1:ethereum': {
            accounts: [
              { id: 'eth1', address: '0x123', name: 'ETH Account 1' },
              { id: 'eth2', address: '0x456', name: 'ETH Account 2' },
            ],
          },
          'snap:solana:mainnet': {
            accounts: [
              { id: 'sol1', address: 'sol123', name: 'SOL Account 1' },
            ],
          },
        },
      };

      const mockEmptyWallet = {
        id: WALLET_ID_EMPTY,
        metadata: { name: 'Empty Wallet' },
        groups: {},
      };

      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  [WALLET_ID_WITH_GROUPS]: mockWalletWithGroups,
                  [WALLET_ID_EMPTY]: mockEmptyWallet,
                },
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

      const selector = selectWalletById(mockState);

      // Test wallet with groups
      const walletWithGroups = selector(WALLET_ID_WITH_GROUPS);
      expect(walletWithGroups).toEqual(mockWalletWithGroups);
      expect(walletWithGroups?.metadata.name).toBe('Test Wallet with Groups');
      expect(
        walletWithGroups?.groups['keyring:1:ethereum'].accounts,
      ).toHaveLength(2);
      expect(
        walletWithGroups?.groups['snap:solana:mainnet'].accounts,
      ).toHaveLength(1);

      // Test wallet with empty groups
      const emptyWallet = selector(WALLET_ID_EMPTY);
      expect(emptyWallet).toEqual(mockEmptyWallet);
      expect(emptyWallet?.metadata.name).toBe('Empty Wallet');
      expect(Object.keys(emptyWallet?.groups || {})).toHaveLength(0);
    });

    it('selector function can be called multiple times with different IDs', () => {
      const mockWallet1 = {
        id: WALLET_ID_A,
        metadata: { name: 'Wallet A' },
        groups: {},
      };

      const mockWallet2 = {
        id: WALLET_ID_B,
        metadata: { name: 'Wallet B' },
        groups: {},
      };

      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  [WALLET_ID_A]: mockWallet1,
                  [WALLET_ID_B]: mockWallet2,
                },
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

      const selector = selectWalletById(mockState);

      // Test multiple calls to the same selector function
      expect(selector(WALLET_ID_A)).toEqual(mockWallet1);
      expect(selector(WALLET_ID_B)).toEqual(mockWallet2);
      expect(selector(WALLET_ID_NONEXISTENT)).toBeNull();
      expect(selector(WALLET_ID_A)).toEqual(mockWallet1); // Test calling again
    });
  });
});
