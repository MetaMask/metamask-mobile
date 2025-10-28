import {
  BaseTransactionResult,
  LastTransactionResult,
  TransactionRecord,
  isTransactionRecord,
  isLastTransactionResult,
} from './transactionTypes';

describe('Transaction Types', () => {
  describe('BaseTransactionResult', () => {
    it('should have all required properties', () => {
      const baseResult: BaseTransactionResult = {
        amount: '100',
        asset: 'USDC',
        txHash: '0x123',
        timestamp: Date.now(),
        success: true,
      };

      expect(baseResult.amount).toBe('100');
      expect(baseResult.asset).toBe('USDC');
      expect(baseResult.txHash).toBe('0x123');
      expect(baseResult.timestamp).toBeGreaterThan(0);
      expect(baseResult.success).toBe(true);
    });
  });

  describe('LastTransactionResult', () => {
    it('should extend BaseTransactionResult with error property', () => {
      const lastResult: LastTransactionResult = {
        amount: '100',
        asset: 'USDC',
        txHash: '0x123',
        timestamp: Date.now(),
        success: false,
        error: 'Transaction failed',
      };

      expect(lastResult.amount).toBe('100');
      expect(lastResult.asset).toBe('USDC');
      expect(lastResult.success).toBe(false);
      expect(lastResult.error).toBe('Transaction failed');
    });

    it('should work with empty error for successful transactions', () => {
      const lastResult: LastTransactionResult = {
        amount: '100',
        asset: 'USDC',
        txHash: '0x123',
        timestamp: Date.now(),
        success: true,
        error: '',
      };

      expect(lastResult.success).toBe(true);
      expect(lastResult.error).toBe('');
    });
  });

  describe('TransactionRecord', () => {
    it('should extend BaseTransactionResult with additional properties', () => {
      const record: TransactionRecord = {
        id: 'tx-123',
        amount: '100',
        asset: 'USDC',
        txHash: '0x123',
        timestamp: Date.now(),
        success: true,
        status: 'completed',
        destination: '0x456',
        transactionId: 'withdrawal-789',
      };

      expect(record.id).toBe('tx-123');
      expect(record.status).toBe('completed');
      expect(record.destination).toBe('0x456');
      expect(record.transactionId).toBe('withdrawal-789');
    });

    it('should work with minimal required properties', () => {
      const record: TransactionRecord = {
        id: 'tx-123',
        amount: '100',
        asset: 'USDC',
        timestamp: Date.now(),
        success: true,
        status: 'pending',
      };

      expect(record.id).toBe('tx-123');
      expect(record.status).toBe('pending');
      expect(record.txHash).toBeUndefined();
      expect(record.destination).toBeUndefined();
      expect(record.transactionId).toBeUndefined();
    });
  });

  describe('Type Guards', () => {
    it('should correctly identify TransactionRecord', () => {
      const record: TransactionRecord = {
        id: 'tx-123',
        amount: '100',
        asset: 'USDC',
        timestamp: Date.now(),
        success: true,
        status: 'pending',
      };

      expect(isTransactionRecord(record)).toBe(true);
      expect(isLastTransactionResult(record)).toBe(false);
    });

    it('should correctly identify LastTransactionResult', () => {
      const lastResult: LastTransactionResult = {
        amount: '100',
        asset: 'USDC',
        txHash: '0x123',
        timestamp: Date.now(),
        success: true,
        error: '',
      };

      expect(isTransactionRecord(lastResult)).toBe(false);
      expect(isLastTransactionResult(lastResult)).toBe(true);
    });

    it('should handle union types correctly', () => {
      const record: TransactionRecord = {
        id: 'tx-123',
        amount: '100',
        asset: 'USDC',
        timestamp: Date.now(),
        success: true,
        status: 'pending',
      };

      const lastResult: LastTransactionResult = {
        amount: '100',
        asset: 'USDC',
        txHash: '0x123',
        timestamp: Date.now(),
        success: true,
        error: '',
      };

      const unionArray: (LastTransactionResult | TransactionRecord)[] = [
        record,
        lastResult,
      ];

      const records = unionArray.filter(isTransactionRecord);
      const lastResults = unionArray.filter(isLastTransactionResult);

      expect(records).toHaveLength(1);
      expect(records[0]).toBe(record);
      expect(lastResults).toHaveLength(1);
      expect(lastResults[0]).toBe(lastResult);
    });
  });
});
