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

  describe('contractTokenMetadata enrichment', () => {
    const USDG_ADDRESS = '0x5fc5360d0400a0fd4f2af552add042d716f1d168';
    const USDG_ADDRESS_CHECKSUMMED =
      '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168';

    const createTokenTransfer = (
      overrides: Partial<TransactionWithImportTime> = {},
    ) =>
      createTransaction({
        type: TransactionType.tokenMethodTransfer,
        txParams: {
          from: '0x123',
          to: USDG_ADDRESS,
          value: '0x0',
          data: '0xa9059cbb0000000000000000000000000000000000000000000000000000000000000456',
        },
        ...overrides,
      });

    const expectLocalTransaction = (
      item: ReturnType<typeof mapTransactionToActivityItem>,
    ) => {
      if (item.raw?.type !== 'localTransaction') {
        throw new Error('Expected local transaction activity item');
      }
      return item.raw.data;
    };

    it('attaches contractTokenMetadata when the tx targets the asset contract', () => {
      const item = mapTransactionToActivityItem({
        transaction: createTokenTransfer(),
        assetSymbol: 'USDG',
        assetDecimals: 6,
        assetAddress: USDG_ADDRESS,
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1237',
      });

      const data = expectLocalTransaction(item);
      expect(data.contractTokenMetadata).toStrictEqual({
        symbol: 'USDG',
        decimals: 6,
      });
    });

    it('matches assetAddress case-insensitively (checksummed vs lowercase)', () => {
      const item = mapTransactionToActivityItem({
        transaction: createTokenTransfer(),
        assetSymbol: 'USDG',
        assetDecimals: 6,
        assetAddress: USDG_ADDRESS_CHECKSUMMED,
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1237',
      });

      expect(expectLocalTransaction(item).contractTokenMetadata).toStrictEqual({
        symbol: 'USDG',
        decimals: 6,
      });
    });

    it('does not attach contractTokenMetadata when the tx targets another contract', () => {
      const item = mapTransactionToActivityItem({
        // to: 0x456 — e.g. a router/swap call on the asset page
        transaction: createTransaction(),
        assetSymbol: 'USDG',
        assetDecimals: 6,
        assetAddress: USDG_ADDRESS,
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1237',
      });

      expect(
        expectLocalTransaction(item).contractTokenMetadata,
      ).toBeUndefined();
    });

    it('does not attach contractTokenMetadata when assetAddress is not provided (legacy call)', () => {
      const item = mapTransactionToActivityItem({
        transaction: createTokenTransfer(),
        assetSymbol: 'USDG',
        currentChainId: '0x1237',
      });

      expect(
        expectLocalTransaction(item).contractTokenMetadata,
      ).toBeUndefined();
    });

    it('does not attach contractTokenMetadata when txParams.to is undefined (contract deployment)', () => {
      const item = mapTransactionToActivityItem({
        transaction: createTransaction({
          txParams: { from: '0x123', value: '0x0' },
        }),
        assetSymbol: 'USDG',
        assetDecimals: 6,
        assetAddress: USDG_ADDRESS,
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1237',
      });

      expect(
        expectLocalTransaction(item).contractTokenMetadata,
      ).toBeUndefined();
    });
  });

  describe('nativeAssetSymbol resolution', () => {
    it('uses the explicit nativeAssetSymbol when provided', () => {
      const item = mapTransactionToActivityItem({
        transaction: createTransaction(),
        assetSymbol: 'USDG',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1237',
      });

      if (item.raw?.type !== 'localTransaction') {
        throw new Error('Expected local transaction activity item');
      }
      expect(item.raw.data.nativeAssetSymbol).toBe('ETH');
    });

    it('falls back to assetSymbol when nativeAssetSymbol is absent (legacy behavior)', () => {
      const item = mapTransactionToActivityItem({
        transaction: createTransaction(),
        assetSymbol: 'USDG',
        currentChainId: '0x1237',
      });

      if (item.raw?.type !== 'localTransaction') {
        throw new Error('Expected local transaction activity item');
      }
      expect(item.raw.data.nativeAssetSymbol).toBe('USDG');
    });
  });
});
