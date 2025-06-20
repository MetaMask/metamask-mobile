import { selectAccountSections } from './accountTreeController';
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
});
