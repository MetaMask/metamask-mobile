import { filterRedundantBridgeTransactions } from './utils';

describe('filterRedundantBridgeTransactions', () => {
  describe('Edge Cases', () => {
    it('should return the same array when input is empty', () => {
      const result = filterRedundantBridgeTransactions([]);
      expect(result).toEqual([]);
    });

    it('should return undefined when input is null', () => {
      const result = filterRedundantBridgeTransactions(null);
      expect(result).toBeNull();
    });

    it('should return undefined when input is undefined', () => {
      const result = filterRedundantBridgeTransactions(undefined);
      expect(result).toBeUndefined();
    });

    it('should return the same array when there is only one transaction', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        }
      ];
      const result = filterRedundantBridgeTransactions(transactions);
      expect(result).toEqual(transactions);
    });
  });

  describe('Normal Functionality', () => {
    it('should filter out incoming transaction when followed by bridge transaction with same value', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      expect(result[0].type).toBe('bridge');
    });

    it('should not filter incoming transaction when bridge transaction has different value', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '2000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter incoming transaction when next transaction is not bridge type', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'outgoing',
          txParams: { value: '1000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when current transaction is not incoming type', () => {
      const transactions = [
        {
          id: '1',
          type: 'outgoing',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });
  });

  describe('Multiple Transactions', () => {
    it('should filter multiple redundant incoming transactions', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '3',
          type: 'incoming',
          txParams: { value: '2000000000000000000' }
        },
        {
          id: '4',
          type: 'bridge',
          txParams: { value: '2000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('4');
    });

    it('should preserve non-redundant transactions in mixed scenario', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '3',
          type: 'incoming',
          txParams: { value: '2000000000000000000' }
        },
        {
          id: '4',
          type: 'outgoing',
          txParams: { value: '2000000000000000000' }
        },
        {
          id: '5',
          type: 'bridge',
          txParams: { value: '3000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(4);
      expect(result.map(tx => tx.id)).toEqual(['2', '3', '4', '5']);
    });
  });

  describe('Missing Properties', () => {
    it('should not filter when incoming transaction has no txParams', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming'
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when incoming transaction has no value', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: {}
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when bridge transaction has no txParams', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge'
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when bridge transaction has no value', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: {}
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });
  });

  describe('Non-consecutive Transactions', () => {
    it('should not filter incoming transactions that are not immediately before bridge transactions', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'outgoing',
          txParams: { value: '500000000000000000' }
        },
        {
          id: '3',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(3);
      expect(result).toEqual(transactions);
    });
  });

  describe('Value Comparison', () => {
    it('should handle string value comparison correctly', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '1000000000000000000' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '1000000000000000000' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should handle zero values correctly', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          txParams: { value: '0' }
        },
        {
          id: '2',
          type: 'bridge',
          txParams: { value: '0' }
        }
      ];

      const result = filterRedundantBridgeTransactions(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });
});
