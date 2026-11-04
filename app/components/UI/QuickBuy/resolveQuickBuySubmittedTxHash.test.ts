import {
  resolveQuickBuySubmittedTxHash,
  type QuickBuyBridgeHistoryItem,
} from './resolveQuickBuySubmittedTxHash';

describe('resolveQuickBuySubmittedTxHash', () => {
  it('uses the submit result hash when it is set', () => {
    expect(
      resolveQuickBuySubmittedTxHash({ id: 'tx-1', hash: '0xdirect' }),
    ).toBe('0xdirect');
  });

  it('uses the receipt hash when the submit result hash is missing', () => {
    expect(
      resolveQuickBuySubmittedTxHash({
        id: 'tx-1',
        txReceipt: { transactionHash: '0xreceipt' },
      }),
    ).toBe('0xreceipt');
  });

  it('uses the bridge history chain hash when the submit result has no hash', () => {
    expect(
      resolveQuickBuySubmittedTxHash(
        { id: 'tx-1' },
        {
          getHistoryItem: () => ({
            reportedSubmittedTxHash: '0xbridge',
          }),
        },
      ),
    ).toBe('0xbridge');
  });

  it('uses the source-chain hash when the reported hash is unset', () => {
    expect(
      resolveQuickBuySubmittedTxHash(
        { id: 'tx-1' },
        {
          historyEntries: [
            ['tx-1', { status: { srcChain: { txHash: '0xsrc' } } }],
          ],
        },
      ),
    ).toBe('0xsrc');
  });

  it('uses the intent order id when the submit result has no chain hash', () => {
    const history: QuickBuyBridgeHistoryItem = {
      originalTransactionId: 'synthetic-1',
      status: { srcChain: {} },
    };

    expect(
      resolveQuickBuySubmittedTxHash(
        { id: 'synthetic-1' },
        { historyEntries: [['order-uid-1', history]] },
      ),
    ).toBe('order-uid-1');
  });

  it('uses the transaction controller hash for a hardware-wallet submit', () => {
    expect(
      resolveQuickBuySubmittedTxHash(
        { id: 'tx-hw' },
        { getTransaction: () => ({ id: 'tx-hw', hash: '0xhw' }) },
      ),
    ).toBe('0xhw');
  });

  it('omits the hash when success has no hash anywhere', () => {
    expect(resolveQuickBuySubmittedTxHash({ id: 'tx-1' })).toBeUndefined();
    expect(resolveQuickBuySubmittedTxHash(undefined)).toBeUndefined();
    expect(resolveQuickBuySubmittedTxHash({ hash: '   ' })).toBeUndefined();
  });
});
