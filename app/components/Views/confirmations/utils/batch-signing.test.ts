import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';

import {
  getRequiredTransactionIds,
  haveRequiredTransactionsBeenSigned,
  isTransactionStatusSignedOrLater,
  type BatchSigningState,
} from './batch-signing';

const PARENT_ID = 'parent-transaction';

function buildTransactionMeta(
  overrides: Partial<TransactionMeta> & { id: string },
): TransactionMeta {
  return {
    chainId: '0x1',
    networkClientId: 'mainnet',
    status: TransactionStatus.unapproved,
    time: 0,
    txParams: { from: '0x1234567890abcdef1234567890abcdef12345678' },
    ...overrides,
  };
}

function buildState(
  requiredTransactionIds: string[],
  legs: TransactionMeta[] = [],
  batchTransactionCounts: Record<string, number> = {},
): BatchSigningState {
  return {
    batchTransactionCounts,
    transactions: [
      buildTransactionMeta({
        id: PARENT_ID,
        status: TransactionStatus.approved,
        requiredTransactionIds,
      }),
      ...legs,
    ],
  };
}

describe('batch-signing', () => {
  it('isTransactionStatusSignedOrLater is true from signed onward only', () => {
    const signedOrLater = [
      TransactionStatus.signed,
      TransactionStatus.submitted,
      TransactionStatus.confirmed,
    ];
    signedOrLater.forEach((status) =>
      expect(isTransactionStatusSignedOrLater(status)).toBe(true),
    );
    [
      TransactionStatus.unapproved,
      TransactionStatus.approved,
      undefined,
    ].forEach((status) =>
      expect(isTransactionStatusSignedOrLater(status)).toBe(false),
    );
  });

  it('getRequiredTransactionIds returns [] for an unknown transaction', () => {
    const { transactions } = buildState(['leg-1']);

    expect(getRequiredTransactionIds('missing', transactions)).toEqual([]);
  });

  describe('haveRequiredTransactionsBeenSigned', () => {
    it('returns false when no funding legs have been added yet', () => {
      expect(
        haveRequiredTransactionsBeenSigned(PARENT_ID, buildState([])),
      ).toBe(false);
    });

    it('returns false when a required leg is missing from state', () => {
      expect(
        haveRequiredTransactionsBeenSigned(PARENT_ID, buildState(['leg-1'])),
      ).toBe(false);
    });

    it('returns false while a single plain leg is still unsigned', () => {
      const state = buildState(
        ['leg-1'],
        [
          buildTransactionMeta({
            id: 'leg-1',
            status: TransactionStatus.approved,
          }),
        ],
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID, state)).toBe(false);
    });

    it('returns true once a single plain leg is signed', () => {
      const state = buildState(
        ['leg-1'],
        [
          buildTransactionMeta({
            id: 'leg-1',
            status: TransactionStatus.signed,
          }),
        ],
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID, state)).toBe(true);
    });

    it('returns false when a batch is still missing expected legs', () => {
      const state = buildState(
        ['leg-1'],
        [
          buildTransactionMeta({
            id: 'leg-1',
            batchId: '0xbatch',
            status: TransactionStatus.signed,
          }),
        ],
        { '0xbatch': 2 },
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID, state)).toBe(false);
    });

    it('returns true once every leg of a batch is signed', () => {
      const state = buildState(
        ['leg-1', 'leg-2'],
        [
          buildTransactionMeta({
            id: 'leg-1',
            batchId: '0xbatch',
            status: TransactionStatus.signed,
          }),
          buildTransactionMeta({
            id: 'leg-2',
            batchId: '0xbatch',
            status: TransactionStatus.submitted,
          }),
        ],
        { '0xbatch': 2 },
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID, state)).toBe(true);
    });

    it('returns false while later quotes have not produced their legs yet', () => {
      const state = buildState(
        ['leg-1'],
        [
          buildTransactionMeta({
            id: 'leg-1',
            status: TransactionStatus.signed,
          }),
        ],
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID, state, 2)).toBe(
        false,
      );
    });

    it('returns true once every quote has a signed leg group', () => {
      const state = buildState(
        ['leg-1', 'leg-2'],
        [
          buildTransactionMeta({
            id: 'leg-1',
            status: TransactionStatus.signed,
          }),
          buildTransactionMeta({
            id: 'leg-2',
            status: TransactionStatus.confirmed,
          }),
        ],
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID, state, 2)).toBe(
        true,
      );
    });
  });
});
