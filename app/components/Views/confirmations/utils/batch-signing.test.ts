import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';

import {
  getRequiredTransactionIds,
  haveRequiredTransactionsBeenSigned,
  isTransactionStatusSignedOrLater,
} from './batch-signing';

const mockTransactions: TransactionMeta[] = [];
const mockBatchTransactionCounts: Record<string, number> = {};
const mockTransactionData: Record<string, { quotes?: unknown[] }> = {};

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (action: string) => {
        if (action === 'TransactionController:getState') {
          return {
            batchTransactionCounts: mockBatchTransactionCounts,
            transactions: mockTransactions,
          };
        }
        if (action === 'TransactionPayController:getState') {
          return { transactionData: mockTransactionData };
        }
        throw new Error(`Unexpected messenger action: ${action}`);
      },
    },
  },
}));

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

function seedParent(requiredTransactionIds: string[]) {
  mockTransactions.push(
    buildTransactionMeta({
      id: PARENT_ID,
      status: TransactionStatus.approved,
      requiredTransactionIds,
    }),
  );
}

describe('batch-signing', () => {
  beforeEach(() => {
    mockTransactions.splice(0);
    Object.keys(mockBatchTransactionCounts).forEach((key) => {
      delete mockBatchTransactionCounts[key];
    });
    Object.keys(mockTransactionData).forEach((key) => {
      delete mockTransactionData[key];
    });
  });

  describe('isTransactionStatusSignedOrLater', () => {
    it.each([
      TransactionStatus.signed,
      TransactionStatus.submitted,
      TransactionStatus.confirmed,
    ])('returns true for %s', (status) => {
      expect(isTransactionStatusSignedOrLater(status)).toBe(true);
    });

    it.each([
      TransactionStatus.unapproved,
      TransactionStatus.approved,
      TransactionStatus.failed,
      TransactionStatus.rejected,
      TransactionStatus.dropped,
      undefined,
    ])('returns false for %s', (status) => {
      expect(isTransactionStatusSignedOrLater(status)).toBe(false);
    });
  });

  describe('getRequiredTransactionIds', () => {
    it('returns the parent required transaction ids', () => {
      seedParent(['leg-1', 'leg-2']);

      expect(getRequiredTransactionIds(PARENT_ID)).toEqual(['leg-1', 'leg-2']);
    });

    it('returns an empty list for an unknown transaction', () => {
      expect(getRequiredTransactionIds('missing')).toEqual([]);
    });
  });

  describe('haveRequiredTransactionsBeenSigned', () => {
    it('returns false when no funding legs have been added yet', () => {
      seedParent([]);

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(false);
    });

    it('returns false when a required leg is missing from controller state', () => {
      seedParent(['leg-1']);

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(false);
    });

    it('returns false while a single plain leg is still unsigned', () => {
      seedParent(['leg-1']);
      mockTransactions.push(
        buildTransactionMeta({
          id: 'leg-1',
          status: TransactionStatus.approved,
        }),
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(false);
    });

    it('returns true once a single plain leg is signed', () => {
      seedParent(['leg-1']);
      mockTransactions.push(
        buildTransactionMeta({ id: 'leg-1', status: TransactionStatus.signed }),
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(true);
    });

    it('returns false when a batch is still missing expected legs', () => {
      seedParent(['leg-1']);
      mockBatchTransactionCounts['0xbatch'] = 2;
      mockTransactions.push(
        buildTransactionMeta({
          id: 'leg-1',
          batchId: '0xbatch',
          status: TransactionStatus.signed,
        }),
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(false);
    });

    it('returns false when one leg of a batch is signed and another is not', () => {
      seedParent(['leg-1', 'leg-2']);
      mockBatchTransactionCounts['0xbatch'] = 2;
      mockTransactions.push(
        buildTransactionMeta({
          id: 'leg-1',
          batchId: '0xbatch',
          status: TransactionStatus.signed,
        }),
        buildTransactionMeta({
          id: 'leg-2',
          batchId: '0xbatch',
          status: TransactionStatus.approved,
        }),
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(false);
    });

    it('returns true once every leg of a batch is signed', () => {
      seedParent(['leg-1', 'leg-2']);
      mockBatchTransactionCounts['0xbatch'] = 2;
      mockTransactions.push(
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
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(true);
    });

    it('returns false while later quotes have not produced their legs yet', () => {
      seedParent(['leg-1']);
      mockTransactionData[PARENT_ID] = { quotes: [{}, {}] };
      mockTransactions.push(
        buildTransactionMeta({ id: 'leg-1', status: TransactionStatus.signed }),
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(false);
    });

    it('returns true once every quote has a signed leg group', () => {
      seedParent(['leg-1', 'leg-2']);
      mockTransactionData[PARENT_ID] = { quotes: [{}, {}] };
      mockTransactions.push(
        buildTransactionMeta({ id: 'leg-1', status: TransactionStatus.signed }),
        buildTransactionMeta({
          id: 'leg-2',
          status: TransactionStatus.confirmed,
        }),
      );

      expect(haveRequiredTransactionsBeenSigned(PARENT_ID)).toBe(true);
    });
  });
});
