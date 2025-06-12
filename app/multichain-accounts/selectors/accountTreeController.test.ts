import { selectAccountSections } from './accountTreeController';
import { RootState } from '../../reducers';

describe('AccountTreeController Selectors', () => {
  describe('selectAccountSections', () => {
    it('returns default group when accountTree is undefined', () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountTreeController: undefined,
          },
        },
      } as unknown as RootState;

      const result = selectAccountSections(mockState);
      expect(result).toEqual([{
        title: 'Default Group',
        data: [],
      }]);
    });

    it('returns default group when accountTree.wallets is null', () => {
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
      expect(result).toEqual([{
        title: 'Default Group',
        data: [],
      }]);
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
          },
        },
      } as unknown as RootState;

      const result = selectAccountSections(mockState);
      expect(result).toEqual([
        {
          title: 'Wallet 1',
          data: mockAccounts,
        },
        {
          title: 'Wallet 2',
          data: [],
        },
      ]);
    });

    it('returns empty sections array when wallets object is empty', () => {
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
      expect(result).toEqual([]);
    });
  });
});
