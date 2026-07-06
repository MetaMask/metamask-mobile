import { SmartTransaction } from '@metamask/smart-transactions-controller';
import { RootState } from '../components/UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  selectTransactions,
  selectLastUsedPaymentMethod,
  selectLastWithdrawTokenByType,
  selectLocalTransactions,
  selectNonReplacedTransactions,
  selectRelatedChainIdsByTransactionId,
  selectRequiredTransactionIds,
  selectRequiredTransactionHashes,
  selectRequiredTransactions,
  selectSwapsTransactions,
  selectTransactionBatchMetadataById,
  selectTransactionMetadataById,
  selectTransactionsByBatchId,
  selectTransactionsByIds,
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

jest.mock('./multichainAccounts/accountTreeController', () => ({
  selectSelectedAccountGroupEvmInternalAccount: (state: {
    groupEvmAccount?: { address: string } | null;
  }) => state.groupEvmAccount ?? null,
}));

jest.mock('./accountsController', () => ({
  selectEvmAddress: (state: { fallbackEvmAddress?: string }) =>
    state.fallbackEvmAddress,
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

  describe('selectRequiredTransactionHashes', () => {
    it('returns hashes for required child transactions', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'parent',
                  requiredTransactionIds: ['child'],
                },
                {
                  id: 'child',
                  hash: '0xABC',
                },
              ],
            },
          },
        },
      } as unknown as RootState;

      expect(selectRequiredTransactionHashes(state)).toStrictEqual(
        new Set(['0xabc']),
      );
    });
  });

  describe('selectRequiredTransactionIds', () => {
    it('returns required child transaction ids', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'parent',
                  requiredTransactionIds: ['child-1', 'child-2'],
                },
                {
                  id: 'child-1',
                },
              ],
            },
          },
        },
      } as unknown as RootState;

      expect(selectRequiredTransactionIds(state)).toStrictEqual(
        new Set(['child-1', 'child-2']),
      );
    });
  });

  describe('selectRequiredTransactions', () => {
    it('returns transactions referenced by required ids', () => {
      const child = {
        id: 'child',
      };
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'parent',
                  requiredTransactionIds: ['child'],
                },
                child,
              ],
            },
          },
        },
      } as unknown as RootState;

      expect(selectRequiredTransactions(state)).toStrictEqual([child]);
    });
  });

  describe('selectRelatedChainIdsByTransactionId', () => {
    const buildState = (transactions: unknown[]) =>
      ({
        engine: {
          backgroundState: {
            TransactionController: { transactions },
          },
        },
      }) as unknown as RootState;

    it('returns the transaction own chain id, lower-cased', () => {
      const state = buildState([{ id: 'lone', chainId: '0xA4B1' }]);

      expect(selectRelatedChainIdsByTransactionId(state).get('lone')).toEqual([
        '0xa4b1',
      ]);
    });

    it('includes metamaskPay.chainId for gasless MetaMask Pay parents', () => {
      const state = buildState([
        {
          id: 'pay-parent',
          chainId: '0xA4B1',
          metamaskPay: { chainId: '0x1' },
        },
      ]);

      expect(
        selectRelatedChainIdsByTransactionId(state).get('pay-parent')?.sort(),
      ).toEqual(['0x1', '0xa4b1']);
    });

    it('includes chain ids of required (child) transactions', () => {
      const state = buildState([
        {
          id: 'parent',
          chainId: '0xA4B1',
          requiredTransactionIds: ['child-1', 'child-2'],
        },
        { id: 'child-1', chainId: '0x1' },
        { id: 'child-2', chainId: '0xA' },
      ]);

      expect(
        selectRelatedChainIdsByTransactionId(state).get('parent')?.sort(),
      ).toEqual(['0x1', '0xa', '0xa4b1']);
    });

    it('dedupes overlapping chain ids', () => {
      const state = buildState([
        {
          id: 'parent',
          chainId: '0x1',
          metamaskPay: { chainId: '0x1' },
          requiredTransactionIds: ['child'],
        },
        { id: 'child', chainId: '0x1' },
      ]);

      expect(selectRelatedChainIdsByTransactionId(state).get('parent')).toEqual(
        ['0x1'],
      );
    });

    it('ignores required ids that point to missing children', () => {
      const state = buildState([
        { id: 'parent', chainId: '0x1', requiredTransactionIds: ['ghost'] },
      ]);

      expect(selectRelatedChainIdsByTransactionId(state).get('parent')).toEqual(
        ['0x1'],
      );
    });
  });

  describe('selectLocalTransactions', () => {
    const evmAddress = '0x0000000000000000000000000000000000000001';

    const buildLocalTxState = ({
      groupEvmAccount = { address: evmAddress },
      transactions,
    }: {
      groupEvmAccount?: { address: string } | null;
      transactions?: unknown[];
    } = {}) =>
      ({
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: transactions ?? [
                {
                  id: 'child',
                  hash: '0xCHILD',
                  chainId: '0x1',
                  time: 200,
                  txParams: { from: evmAddress, nonce: '0x1' },
                },
                {
                  id: 'parent',
                  chainId: '0x1',
                  requiredTransactionIds: ['child'],
                  time: 100,
                  type: TransactionType.predictDeposit,
                  txParams: { from: evmAddress, nonce: '0x1' },
                },
              ],
            },
          },
        },
        groupEvmAccount,
        pendingSmartTransactionsForGroup: [],
      }) as unknown as RootState;

    it('filters required child transactions before nonce dedupe', () => {
      expect(selectLocalTransactions(buildLocalTxState())).toStrictEqual([
        expect.objectContaining({ id: 'parent' }),
      ]);
    });

    it('returns no transactions when the selected group has no EVM account', () => {
      expect(
        selectLocalTransactions(buildLocalTxState({ groupEvmAccount: null })),
      ).toStrictEqual([]);
    });

    it('hides prior failed attempts when a live attempt exists at the same nonce', () => {
      const state = buildLocalTxState({
        transactions: [
          {
            id: 'failed-attempt',
            chainId: '0x1',
            time: 100,
            status: TransactionStatus.failed,
            txParams: { from: evmAddress, nonce: '0x1' },
          },
          {
            id: 'retry-success',
            chainId: '0x1',
            time: 200,
            status: TransactionStatus.confirmed,
            txParams: { from: evmAddress, nonce: '0x1' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'retry-success' }),
      ]);
    });

    it('hides prior failed attempts when a pending retry exists at the same nonce', () => {
      const state = buildLocalTxState({
        transactions: [
          {
            id: 'failed-attempt',
            chainId: '0x1',
            time: 100,
            status: TransactionStatus.failed,
            txParams: { from: evmAddress, nonce: '0x1' },
          },
          {
            id: 'retry-pending',
            chainId: '0x1',
            time: 200,
            status: TransactionStatus.submitted,
            txParams: { from: evmAddress, nonce: '0x1' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'retry-pending' }),
      ]);
    });

    it('keeps all failed attempts visible when no live attempt exists at the same nonce', () => {
      const state = buildLocalTxState({
        transactions: [
          {
            id: 'failed-1',
            chainId: '0x1',
            time: 100,
            status: TransactionStatus.failed,
            txParams: { from: evmAddress, nonce: '0x1' },
          },
          {
            id: 'failed-2',
            chainId: '0x1',
            time: 200,
            status: TransactionStatus.failed,
            txParams: { from: evmAddress, nonce: '0x1' },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'failed-2' }),
        expect.objectContaining({ id: 'failed-1' }),
      ]);
    });

    it('excludes incoming transactions populated by the TransactionController incoming-transactions feature', () => {
      const state = buildLocalTxState({
        transactions: [
          {
            id: 'outgoing',
            hash: '0xOUTGOING',
            chainId: '0x1',
            time: 200,
            txParams: { from: evmAddress, nonce: '0x1' },
          },
          {
            id: 'incoming-duplicate',
            hash: '0xOUTGOING',
            chainId: '0x1',
            time: 100,
            isTransfer: true,
            txParams: { from: evmAddress },
          },
        ],
      });

      expect(selectLocalTransactions(state)).toStrictEqual([
        expect.objectContaining({ id: 'outgoing' }),
      ]);
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

  describe('selectTransactionBatchMetadataById', () => {
    it('returns the transaction batch matching the given id', () => {
      const batch = {
        id: 'batch-id',
      };
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [],
              transactionBatches: [batch],
            },
          },
        },
      } as unknown as RootState;

      expect(selectTransactionBatchMetadataById(state, 'batch-id')).toBe(batch);
    });
  });

  describe('selectTransactionsByIds', () => {
    it('returns matching transactions in requested id order', () => {
      const first = {
        id: 'first',
      };
      const second = {
        id: 'second',
      };
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [first, second],
            },
          },
        },
      } as unknown as RootState;

      expect(
        selectTransactionsByIds(state, ['second', 'missing', 'first']),
      ).toStrictEqual([second, first]);
    });
  });

  describe('selectTransactionsByBatchId', () => {
    it('returns transactions matching the batch id', () => {
      const matchingTransaction = {
        id: 'matching',
        batchId: 'batch-id',
      };
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                matchingTransaction,
                {
                  id: 'other',
                  batchId: 'other-batch-id',
                },
              ],
            },
          },
        },
      } as unknown as RootState;

      expect(selectTransactionsByBatchId(state, 'batch-id')).toStrictEqual([
        matchingTransaction,
      ]);
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

  describe('selectLastWithdrawTokenByType', () => {
    it('returns token from latest nested predictWithdraw transaction', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'older',
                  metamaskPay: {
                    chainId: '0x89',
                    tokenAddress: '0xolder',
                  },
                  nestedTransactions: [
                    { type: TransactionType.predictWithdraw },
                  ],
                  time: 100,
                  type: TransactionType.batch,
                },
                {
                  id: 'latest',
                  metamaskPay: {
                    chainId: '0x38',
                    tokenAddress: '0xlatest',
                  },
                  nestedTransactions: [
                    { type: TransactionType.predictWithdraw },
                  ],
                  time: 200,
                  type: TransactionType.batch,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastWithdrawTokenByType(
        state,
        TransactionType.predictWithdraw,
      );

      expect(result).toStrictEqual({
        address: '0xlatest',
        chainId: '0x38',
      });
    });

    it('ignores nested predictWithdraw transactions without metamaskPay and uses the latest one with metamaskPay', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'newer-without-metamask-pay',
                  nestedTransactions: [
                    { type: TransactionType.predictWithdraw },
                  ],
                  time: 300,
                  type: TransactionType.batch,
                },
                {
                  id: 'latest-with-metamask-pay',
                  metamaskPay: {
                    chainId: '0x38',
                    tokenAddress: '0xlatest',
                  },
                  nestedTransactions: [
                    { type: TransactionType.predictWithdraw },
                  ],
                  time: 200,
                  type: TransactionType.batch,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastWithdrawTokenByType(
        state,
        TransactionType.predictWithdraw,
      );

      expect(result).toStrictEqual({
        address: '0xlatest',
        chainId: '0x38',
      });
    });

    it('returns undefined when matching nested predictWithdraw transaction has no metamaskPay token', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'latest',
                  nestedTransactions: [
                    { type: TransactionType.predictWithdraw },
                  ],
                  time: 200,
                  type: TransactionType.batch,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastWithdrawTokenByType(
        state,
        TransactionType.predictWithdraw,
      );

      expect(result).toBeUndefined();
    });
  });

  describe('selectLastUsedPaymentMethod', () => {
    it('returns the token from the latest non-replaced transaction matching the type, ignoring the current transaction', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'older',
                  metamaskPay: {
                    chainId: '0x1',
                    tokenAddress: '0xolder',
                  },
                  time: 100,
                  type: TransactionType.perpsDeposit,
                },
                {
                  id: 'latest',
                  metamaskPay: {
                    chainId: '0x89',
                    tokenAddress: '0xlatest',
                  },
                  time: 200,
                  type: TransactionType.perpsDeposit,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastUsedPaymentMethod(
        state,
        TransactionType.perpsDeposit,
        'unrelated-current-tx-id',
      );

      expect(result).toStrictEqual({
        address: '0xlatest',
        chainId: '0x89',
      });
    });

    it('returns undefined when transactionType is not provided', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'tx',
                  metamaskPay: {
                    chainId: '0x1',
                    tokenAddress: '0xabc',
                  },
                  time: 100,
                  type: TransactionType.perpsDeposit,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastUsedPaymentMethod(state, undefined);

      expect(result).toBeUndefined();
    });

    it('skips transactions of a different type', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'perps',
                  metamaskPay: {
                    chainId: '0x1',
                    tokenAddress: '0xperps',
                  },
                  time: 200,
                  type: TransactionType.perpsDeposit,
                },
                {
                  id: 'predict',
                  metamaskPay: {
                    chainId: '0x89',
                    tokenAddress: '0xpredict',
                  },
                  time: 100,
                  type: TransactionType.predictDeposit,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastUsedPaymentMethod(
        state,
        TransactionType.predictDeposit,
      );

      expect(result).toStrictEqual({
        address: '0xpredict',
        chainId: '0x89',
      });
    });

    it('returns undefined when no matching transaction has metamaskPay metadata', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'tx',
                  time: 200,
                  type: TransactionType.perpsDeposit,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastUsedPaymentMethod(
        state,
        TransactionType.perpsDeposit,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the matching transaction has no tokenAddress', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'tx',
                  metamaskPay: {
                    chainId: '0x1',
                  },
                  time: 200,
                  type: TransactionType.perpsDeposit,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastUsedPaymentMethod(
        state,
        TransactionType.perpsDeposit,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when the transactions list is empty', () => {
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

      const result = selectLastUsedPaymentMethod(
        state,
        TransactionType.perpsDeposit,
      );

      expect(result).toBeUndefined();
    });

    it('matches the type via nestedTransactions when metamaskPay is set on the batch parent', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'batch',
                  metamaskPay: {
                    chainId: '0x89',
                    tokenAddress: '0xnested',
                  },
                  nestedTransactions: [{ type: TransactionType.perpsDeposit }],
                  time: 200,
                  type: TransactionType.batch,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastUsedPaymentMethod(
        state,
        TransactionType.perpsDeposit,
      );

      expect(result).toStrictEqual({
        address: '0xnested',
        chainId: '0x89',
      });
    });

    it('skips the current transaction so an in-progress selection is not surfaced as last used', () => {
      const state = {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  id: 'previous',
                  metamaskPay: {
                    chainId: '0x1',
                    tokenAddress: '0xprevious',
                  },
                  time: 100,
                  type: TransactionType.perpsDeposit,
                },
                {
                  id: 'current',
                  metamaskPay: {
                    chainId: '0x89',
                    tokenAddress: '0xcurrent',
                  },
                  time: 200,
                  type: TransactionType.perpsDeposit,
                },
              ],
            },
          },
        },
        pendingSmartTransactions: [],
      } as unknown as RootState;

      const result = selectLastUsedPaymentMethod(
        state,
        TransactionType.perpsDeposit,
        'current',
      );

      expect(result).toStrictEqual({
        address: '0xprevious',
        chainId: '0x1',
      });
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
