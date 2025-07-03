import { filterDuplicateOutgoingTransactions } from './utils';
import { TransactionMeta } from '@metamask/transaction-controller';

const HASH_1 = '0x1234567890';
const HASH_2 = '0xabcdef1234';
const HASH_3 = '0x1234567891';

/**
 * Helper function to create a transaction object.
 *
 * @param id - The transaction ID.
 * @param type - The transaction type.
 * @param hash - The transaction hash.
 * @param value - The transaction value.
 * @returns A transaction object.
 */
const createTransaction = (
  id: string,
  type: string,
  hash?: string,
  value?: string,
): TransactionMeta => ({
  id,
  type,
  hash,
  txParams: value ? { value } : undefined,
} as unknown as TransactionMeta);

describe('filterDuplicateOutgoingTransactions', () => {
  describe('Edge Cases', () => {
    it('should return the same array when input is empty', () => {
      const result = filterDuplicateOutgoingTransactions([]);
      expect(result).toEqual([]);
    });

    it('should return null when input is null', () => {
      const result = filterDuplicateOutgoingTransactions(null as unknown as TransactionMeta[]);
      expect(result).toBeNull();
    });

    it('should return undefined when input is undefined', () => {
      const result = filterDuplicateOutgoingTransactions(undefined as unknown as TransactionMeta[]);
      expect(result).toBeUndefined();
    });

    it('should return the same array when there is only one transaction', () => {
      const transactions = [createTransaction('1', 'incoming', HASH_1, '100')];
      const result = filterDuplicateOutgoingTransactions(transactions);
      expect(result).toEqual(transactions);
    });
  });

  describe('Normal Functionality', () => {
    it('should filter out incoming transaction when followed by bridge transaction with same hash', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'bridge', HASH_1, '100'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      expect(result[0].type).toBe('bridge');
    });

    it('should not filter incoming transaction when bridge transaction has different hash', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'bridge', HASH_2, '100'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });
  });

  describe('Multiple Transactions', () => {
    it('should filter multiple redundant incoming transactions', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'bridge', HASH_1, '100'),
        createTransaction('3', 'incoming', HASH_2, '200'),
        createTransaction('4', 'bridge', HASH_2, '200'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('4');
    });

    it('should preserve non-redundant transactions in mixed scenario', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'bridge', HASH_1, '100'),
        createTransaction('3', 'incoming', HASH_2, '200'),
        createTransaction('4', 'outgoing', HASH_2, '200'),
        createTransaction('5', 'bridge', HASH_3, '300'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(3);
      expect(result.map((tx) => tx.id)).toEqual(['2', '4', '5']);
    });
  });

  describe('Missing Properties', () => {
    it('should not filter when incoming transaction has no hash', () => {
      const transactions = [
        createTransaction('1', 'incoming', undefined, '100'),
        createTransaction('2', 'bridge', HASH_1, '100'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when bridge transaction has no hash', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'bridge', undefined, '100'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });
  });

  describe('Value Comparison', () => {
    it('should handle string value comparison correctly', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'bridge', HASH_1, '100'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('Additional Cases', () => {
    it('should filter when incoming transaction is not immediately followed by outgoing transaction with same hash', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'outgoing', HASH_2, '200'),
        createTransaction('3', 'bridge', HASH_1, '100'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(2);
      expect(result).toEqual([transactions[1], transactions[2]]);
    });

    it('should filter only redundant incoming transactions when multiple transactions have the same hash', () => {
      const transactions = [
        createTransaction('1', 'incoming', HASH_1, '100'),
        createTransaction('2', 'incoming', HASH_1, '100'),
        createTransaction('3', 'bridge', HASH_1, '100'),
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });
  });
});
