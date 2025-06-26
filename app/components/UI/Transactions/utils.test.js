import { filterDuplicateOutgoingTransactions } from './utils';

const HASH_1 = '0x1234567890';
const HASH_2 = '0xabcdef1234';
const HASH_3 = '0x1234567891';

describe('filterDuplicateOutgoingTransactions', () => {
  describe('Edge Cases', () => {
    it('should return the same array when input is empty', () => {
      const result = filterDuplicateOutgoingTransactions([]);
      expect(result).toEqual([]);
    });

    it('should return undefined when input is null', () => {
      const result = filterDuplicateOutgoingTransactions(null);
      expect(result).toBeNull();
    });

    it('should return undefined when input is undefined', () => {
      const result = filterDuplicateOutgoingTransactions(undefined);
      expect(result).toBeUndefined();
    });

    it('should return the same array when there is only one transaction', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        }
      ];
      const result = filterDuplicateOutgoingTransactions(transactions);
      expect(result).toEqual(transactions);
    });
  });

  describe('Normal Functionality', () => {
    it('should filter out incoming transaction when followed by bridge transaction with same hash', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge',
          hash: HASH_1
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
      expect(result[0].type).toBe('bridge');
    });

    it('should not filter incoming transaction when bridge transaction has different value', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge',
          hash: HASH_2
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter incoming transaction when next transaction is also incoming type', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'incoming',
          hash: HASH_1
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when current transaction is not incoming type', () => {
      const transactions = [
        {
          id: '1',
          type: 'outgoing',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge',
          hash: HASH_1
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
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
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge',
          hash: HASH_1
        },
        {
          id: '3',
          type: 'incoming',
          hash: HASH_2
        },
        {
          id: '4',
          type: 'bridge',
          hash: HASH_2
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('4');
    });

    it('should preserve non-redundant transactions in mixed scenario', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge',
          hash: HASH_1
        },
        {
          id: '3',
          type: 'incoming',
          hash: HASH_2
        },
        {
          id: '4',
          type: 'outgoing',
          hash: HASH_2
        },
        {
          id: '5',
          type: 'bridge',
          hash: HASH_3
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(3);
      expect(result.map(tx => tx.id)).toEqual(['2', '4', '5']);
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
          hash: HASH_1
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
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
          hash: HASH_1
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when bridge transaction has no txParams', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge'
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });

    it('should not filter when bridge transaction has no value', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge',
          txParams: {}
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(transactions);
    });
  });

  describe('Non-consecutive Transactions', () => {
    it('should not filter incoming transactions that are not immediately before outgoing transactions with the same hash', () => {
      const transactions = [
        {
          id: '1',
          type: 'incoming',
          hash: HASH_1
        },
        {
          id: '2',
          type: 'outgoing',
          hash: HASH_2
        },
        {
          id: '3',
          type: 'bridge',
          hash: HASH_1
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
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
          hash: HASH_1
        },
        {
          id: '2',
          type: 'bridge',
          hash: HASH_1
        }
      ];

      const result = filterDuplicateOutgoingTransactions(transactions);
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });
});
