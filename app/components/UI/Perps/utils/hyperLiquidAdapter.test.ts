import {
  adaptHyperLiquidLedgerUpdateToUserHistoryItem,
  RawHyperLiquidLedgerUpdate,
} from './hyperLiquidAdapter';

describe('adaptHyperLiquidLedgerUpdateToUserHistoryItem', () => {
  it('should transform deposit updates correctly', () => {
    const rawUpdates: RawHyperLiquidLedgerUpdate[] = [
      {
        hash: '0x123',
        time: 1640995200000,
        delta: {
          type: 'deposit',
          usdc: '100.50',
        },
      },
    ];

    const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'history-0x123',
      timestamp: 1640995200000,
      amount: '100.5',
      asset: 'USDC',
      txHash: '0x123',
      status: 'completed',
      type: 'deposit',
      details: {
        source: '',
        bridgeContract: undefined,
        recipient: undefined,
        blockNumber: undefined,
        chainId: undefined,
        synthetic: undefined,
      },
    });
  });

  it('should transform withdrawal updates correctly', () => {
    const rawUpdates: RawHyperLiquidLedgerUpdate[] = [
      {
        hash: '0x456',
        time: 1640995200000,
        delta: {
          type: 'withdraw',
          usdc: '50.25',
          coin: 'ETH',
        },
      },
    ];

    const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'history-0x456',
      timestamp: 1640995200000,
      amount: '50.25',
      asset: 'ETH',
      txHash: '0x456',
      status: 'completed',
      type: 'withdrawal',
      details: {
        source: '',
        bridgeContract: undefined,
        recipient: undefined,
        blockNumber: undefined,
        chainId: undefined,
        synthetic: undefined,
      },
    });
  });

  it('should filter out non-deposit/withdrawal updates', () => {
    const rawUpdates: RawHyperLiquidLedgerUpdate[] = [
      {
        hash: '0x123',
        time: 1640995200000,
        delta: {
          type: 'deposit',
          usdc: '100',
        },
      },
      {
        hash: '0x456',
        time: 1640995200000,
        delta: {
          type: 'transfer',
          usdc: '50',
        },
      },
      {
        hash: '0x789',
        time: 1640995200000,
        delta: {
          type: 'withdraw',
          usdc: '25',
        },
      },
    ];

    const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('deposit');
    expect(result[1].type).toBe('withdrawal');
  });

  it('should handle empty arrays', () => {
    const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem([]);
    expect(result).toEqual([]);
  });

  it('should handle null/undefined input', () => {
    const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(
      null as unknown as RawHyperLiquidLedgerUpdate[],
    );
    expect(result).toEqual([]);
  });

  it('should handle negative amounts by taking absolute value', () => {
    const rawUpdates: RawHyperLiquidLedgerUpdate[] = [
      {
        hash: '0x123',
        time: 1640995200000,
        delta: {
          type: 'withdraw',
          usdc: '-100.50',
        },
      },
    ];

    const result = adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawUpdates);

    expect(result[0].amount).toBe('100.5');
  });
});
