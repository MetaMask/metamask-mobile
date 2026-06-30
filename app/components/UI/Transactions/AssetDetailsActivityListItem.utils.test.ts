import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  getTransactionDetailsParams,
  mapTransactionToActivityItem,
  type TransactionWithImportTime,
} from './AssetDetailsActivityListItem.utils';

const createTransaction = (
  overrides: Partial<TransactionWithImportTime> = {},
): TransactionWithImportTime => ({
  id: 'tx-1',
  chainId: '0x1',
  hash: '0xabc',
  networkClientId: 'mainnet',
  status: TransactionStatus.confirmed,
  time: 1000,
  type: TransactionType.simpleSend,
  txParams: {
    from: '0x123',
    to: '0x456',
    value: '0x1',
  },
  ...overrides,
});

describe('AssetDetailsActivityListItem utils', () => {
  it('maps transaction metadata to activity item with asset details chain context', () => {
    const transaction = createTransaction({
      chainId: undefined,
      txParams: {
        from: '0x123',
        to: '0x456',
        value: '0x1',
      },
    });

    const item = mapTransactionToActivityItem({
      transaction,
      assetSymbol: 'ETH',
      currentChainId: '0x1',
      tokenChainId: '0x89',
    });

    expect(item.raw?.type).toBe('localTransaction');
    if (item.raw?.type !== 'localTransaction') {
      throw new Error('Expected local transaction activity item');
    }
    expect(item.chainId).toBe('eip155:137');
    expect(item.raw?.data.primaryTransaction.chainId).toBe('0x89');
    expect(item.raw?.data.primaryTransaction.txParams.chainId).toBe('0x89');
    expect(item.raw?.data.nativeAssetSymbol).toBe('ETH');
  });

  it('creates transaction details params for redesigned asset detail rows', () => {
    const selectedTx = createTransaction();
    const item = mapTransactionToActivityItem({
      transaction: selectedTx,
      assetSymbol: 'ETH',
      currentChainId: '0x1',
    });
    const showSpeedUpModal = jest.fn();
    const showCancelModal = jest.fn();

    const params = getTransactionDetailsParams({
      item,
      selectedTx,
      actionKey: 'Send ETH',
      value: '1 ETH',
      from: '0x123',
      to: '0x456',
      currentChainId: '0x1',
      tokenChainId: '0x89',
      showSpeedUpModal,
      showCancelModal,
    });

    expect(params).toStrictEqual({
      tx: selectedTx,
      transactionElement: {
        actionKey: 'Send ETH',
        value: '1 ETH',
      },
      transactionDetails: {
        hash: item.hash,
        renderFrom: '0x123',
        renderTo: '0x456',
        renderValue: '1 ETH',
        transactionType: item.type,
        txChainId: '0x1',
      },
      showSpeedUpModal,
      showCancelModal,
    });
  });
});
