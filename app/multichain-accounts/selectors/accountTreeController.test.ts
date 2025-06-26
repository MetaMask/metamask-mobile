import {
  selectAccountSections,
  selectWalletById,
} from './accountTreeController';
import { RootState } from '../../reducers';

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
                  wallet1: {
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
                  wallet2: {
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
      const result = selector('wallet1');
      expect(result).toEqual(null);
    });

    it('returns null when multichain accounts feature is disabled', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  wallet1: {
                    id: 'wallet1',
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
      const result = selector('wallet1');
      expect(result).toEqual(null);
    });

    it('returns wallet when found by ID', () => {
      const mockWallet = {
        id: 'wallet1',
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
                  wallet1: mockWallet,
                  wallet2: {
                    id: 'wallet2',
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
      const result = selector('wallet1');
      expect(result).toEqual(mockWallet);
    });

    it('returns null when wallet ID is not found', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  wallet1: {
                    id: 'wallet1',
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
      const result = selector('nonexistent-wallet');
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
      const result = selector('wallet1');
      expect(result).toEqual(null);
    });

    it('returns correct wallet when multiple wallets exist', () => {
      const mockWallet1 = {
        id: 'wallet1',
        metadata: { name: 'First Wallet' },
        groups: {
          'keyring:1:ethereum': {
            accounts: [{ id: 'eth1', address: '0x123', name: 'ETH Account 1' }],
          },
        },
      };

      const mockWallet2 = {
        id: 'wallet2',
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
                  wallet1: mockWallet1,
                  wallet2: mockWallet2,
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
      const result1 = selector('wallet1');
      expect(result1).toEqual(mockWallet1);

      // Test retrieving second wallet
      const result2 = selector('wallet2');
      expect(result2).toEqual(mockWallet2);
    });

    it('returns wallet with metadata and various group structures', () => {
      const mockWalletWithGroups = {
        id: 'wallet-with-groups',
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
        id: 'empty-wallet',
        metadata: { name: 'Empty Wallet' },
        groups: {},
      };

      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  'wallet-with-groups': mockWalletWithGroups,
                  'empty-wallet': mockEmptyWallet,
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
      const walletWithGroups = selector('wallet-with-groups');
      expect(walletWithGroups).toEqual(mockWalletWithGroups);
      expect(walletWithGroups?.metadata.name).toBe('Test Wallet with Groups');
      expect(
        walletWithGroups?.groups['keyring:1:ethereum'].accounts,
      ).toHaveLength(2);
      expect(
        walletWithGroups?.groups['snap:solana:mainnet'].accounts,
      ).toHaveLength(1);

      // Test wallet with empty groups
      const emptyWallet = selector('empty-wallet');
      expect(emptyWallet).toEqual(mockEmptyWallet);
      expect(emptyWallet?.metadata.name).toBe('Empty Wallet');
      expect(Object.keys(emptyWallet?.groups || {})).toHaveLength(0);
    });

    it('selector function can be called multiple times with different IDs', () => {
      const mockWallet1 = {
        id: 'wallet-a',
        metadata: { name: 'Wallet A' },
        groups: {},
      };

      const mockWallet2 = {
        id: 'wallet-b',
        metadata: { name: 'Wallet B' },
        groups: {},
      };

      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: {
              accountTree: {
                wallets: {
                  'wallet-a': mockWallet1,
                  'wallet-b': mockWallet2,
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
      expect(selector('wallet-a')).toEqual(mockWallet1);
      expect(selector('wallet-b')).toEqual(mockWallet2);
      expect(selector('nonexistent')).toBeNull();
      expect(selector('wallet-a')).toEqual(mockWallet1); // Test calling again
    });
  });
});
