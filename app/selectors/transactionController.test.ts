import { SmartTransaction } from '@metamask/smart-transactions-controller/dist/types';
import { RootState } from '../components/UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import {
  selectTransactions,
  selectNonReplacedTransactions,
  selectSwapsTransactions,
  selectTransactionMetadataById,
  selectSortedTransactions,
  selectSortedEVMTransactionsForSelectedAccountGroup,
} from './transactionController';

jest.mock('./smartTransactionsController', () => ({
  selectPendingSmartTransactionsBySender: (state: {
    pendingSmartTransactions: SmartTransaction[];
  }) => state.pendingSmartTransactions || [],
  selectPendingSmartTransactionsForSelectedAccountGroup: (state: {
    pendingSmartTransactionsForGroup: SmartTransaction[];
  }) => state.pendingSmartTransactionsForGroup || [],
}));

describe('TransactionController Selectors', () => {
  describe('selectTransactions', () => {
    it('returns transactions from TransactionController state', () => {
      const transactions = [{ id: 1 }, { id: 2 }];
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
      } as unknown as RootState;

      expect(selectTransactions(state)).toStrictEqual(transactions);
    });
  });

  describe('selectNonReplacedTransactions', () => {
    it('filters out transactions that have replacedBy, replacedById, and hash all truthy', () => {
      const transactions = [
        { id: '1', replacedBy: 'x', replacedById: 'y', hash: 'z' }, // should be filtered out
        { id: '2', replacedBy: null, replacedById: null, hash: null }, // kept
        { id: '3', replacedBy: 'a', replacedById: 'b' }, // missing hash, kept
        { id: '4', replacedBy: 'a', replacedById: 'b', hash: '' }, // empty hash (falsy), kept
      ];
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
      } as unknown as RootState;

      const expected = [
        { id: '2', replacedBy: null, replacedById: null, hash: null },
        { id: '3', replacedBy: 'a', replacedById: 'b' },
        { id: '4', replacedBy: 'a', replacedById: 'b', hash: '' },
      ];
      expect(selectNonReplacedTransactions(state)).toStrictEqual(expected);
    });
  });

  describe('selectSwapsTransactions', () => {
    it('returns swapsTransactions if present', () => {
      const swaps = { swap1: 'data' };
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [],
              swapsTransactions: swaps,
            },
          },
        },
      } as unknown as RootState;
      expect(selectSwapsTransactions(state)).toStrictEqual(swaps);
    });

    it('returns an empty object if swapsTransactions is not present', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [],
              // swapsTransactions is missing
            },
          },
        },
      } as unknown as RootState;
      expect(selectSwapsTransactions(state)).toStrictEqual({});
    });
  });

  describe('selectTransactionMetadataById', () => {
    it('returns the transaction matching the given id', () => {
      const transactions = [
        { id: 'a', data: 'foo' },
        { id: 'b', data: 'bar' },
      ];
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
      } as unknown as RootState;
      expect(selectTransactionMetadataById(state, 'a')).toStrictEqual({
        id: 'a',
        data: 'foo',
      });
      expect(selectTransactionMetadataById(state, 'b')).toStrictEqual({
        id: 'b',
        data: 'bar',
      });
    });

    it('returns undefined if no transaction matches the given id', () => {
      const transactions = [{ id: 'a', data: 'foo' }];
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
      } as unknown as RootState;
      expect(
        selectTransactionMetadataById(state, 'non-existent'),
      ).toBeUndefined();
    });
  });

  describe('selectSortedTransactions', () => {
    it('merges non-replaced transactions and pending smart transactions and sorts them descending by time', () => {
      // Transactions with one replaced transaction and two non-replaced ones
      const transactions = [
        { id: '1', time: 100 },
        { id: '2', time: 200, replacedBy: 'x', replacedById: 'y', hash: 'z' }, // replaced, filtered out
        { id: '3', time: 50 },
      ];
      // Pending smart transactions provided via our mocked selector
      const pendingSmartTransactions = [
        { id: '4', time: 150 },
        { id: '5', time: 250 },
      ];

      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
        pendingSmartTransactions,
      } as unknown as RootState;

      const expectedSorted = [
        { id: '5', time: 250 },
        { id: '4', time: 150 },
        { id: '1', time: 100 },
        { id: '3', time: 50 },
      ];

      expect(selectSortedTransactions(state)).toStrictEqual(expectedSorted);
    });

    it('handles empty arrays correctly', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;
      expect(selectSortedTransactions(state)).toStrictEqual([]);
    });

    it('merge non-replaced transactions and pending smart when time is not present', () => {
      // Transactions with one replaced transaction and two non-replaced ones
      const transactions = [
        { id: '1' },
        { id: '2', time: 50, replacedBy: 'x', replacedById: 'y', hash: 'z' }, // replaced, filtered out
        { id: '3' },
      ];
      // Pending smart transactions provided via our mocked selector
      const pendingSmartTransactions = [{ id: '4' }, { id: '5', time: 250 }];

      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
        pendingSmartTransactions,
      } as unknown as RootState;

      const expectedSorted = [
        { id: '5', time: 250 },
        { id: '1' },
        { id: '3' },
        { id: '4' },
      ];

      expect(selectSortedTransactions(state)).toStrictEqual(expectedSorted);
    });
  });

  describe('selectSortedEVMTransactionsForSelectedAccountGroup', () => {
    it('merges non-replaced transactions and pending smart transactions for selected group and sorts descending by time', () => {
      const transactions = [
        { id: '1', time: 100 },
        { id: '2', time: 200, replacedBy: 'x', replacedById: 'y', hash: 'z' },
        { id: '3', time: 50 },
      ];

      const pendingSmartTransactionsForGroup = [
        { id: '4', time: 150 },
        { id: '5', time: 250 },
      ];

      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
        pendingSmartTransactionsForGroup,
      } as unknown as RootState;

      const expectedSorted = [
        { id: '5', time: 250 },
        { id: '4', time: 150 },
        { id: '1', time: 100 },
        { id: '3', time: 50 },
      ];

      expect(
        selectSortedEVMTransactionsForSelectedAccountGroup(state),
      ).toStrictEqual(expectedSorted);
    });

    it('handles empty arrays correctly', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [],
            },
          },
        },
        pendingSmartTransactionsForGroup: [],
      } as unknown as RootState;

      expect(
        selectSortedEVMTransactionsForSelectedAccountGroup(state),
      ).toStrictEqual([]);
    });

    it('merges non-replaced transactions and pending smart for group when time is not present', () => {
      const transactions = [
        { id: '1' },
        { id: '2', time: 50, replacedBy: 'x', replacedById: 'y', hash: 'z' },
        { id: '3' },
      ];

      const pendingSmartTransactionsForGroup = [
        { id: '4' },
        { id: '5', time: 250 },
      ];

      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions,
            },
          },
        },
        pendingSmartTransactionsForGroup,
      } as unknown as RootState;

      const expectedSorted = [
        { id: '5', time: 250 },
        { id: '1' },
        { id: '3' },
        { id: '4' },
      ];

      expect(
        selectSortedEVMTransactionsForSelectedAccountGroup(state),
      ).toStrictEqual(expectedSorted);
    });
  });
});
