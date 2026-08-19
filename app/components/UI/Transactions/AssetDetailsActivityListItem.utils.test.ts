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

  describe('swap enrichment from the bridge/swaps quote', () => {
    const USDC_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const SWAP_ROUTER = '0x0439e60f02a8900a951603950d8d4527f400c3f1';

    // `swapMetaData` is a legacy SwapsController field that never made it onto
    // TransactionMeta, so it is declared here rather than cast at each call.
    type LegacySwapOverrides = Partial<TransactionWithImportTime> & {
      swapMetaData?: { token_from?: string; token_to?: string };
    };

    const createSwap = (overrides: LegacySwapOverrides = {}) =>
      createTransaction({
        type: TransactionType.swap,
        txParams: { from: '0x123', to: SWAP_ROUTER, value: '0x0' },
        ...overrides,
      } as Partial<TransactionWithImportTime>);

    // Unified swaps keep both legs in the quote, not on the TransactionMeta.
    const createBridgeHistoryItem = (status?: {
      destChain?: { txHash: string };
    }) =>
      ({
        quote: {
          srcChainId: '0x1',
          destChainId: '0x1',
          srcAsset: {
            address: USDC_ADDRESS,
            symbol: 'USDC',
            decimals: 6,
            assetId: 'eip155:1/erc20:0xa0b8',
          },
          destAsset: { address: '0x0', symbol: 'ETH', decimals: 18 },
          srcTokenAmount: '10000',
          destTokenAmount: '3000000000000',
        },
        ...(status ? { status } : {}),
      }) as never;

    const bridgeHistoryItem = createBridgeHistoryItem();
    const completedBridgeHistoryItem = createBridgeHistoryItem({
      destChain: { txHash: '0xdest' },
    });

    it('resolves a complete swap when the quote is available', () => {
      const item = mapTransactionToActivityItem({
        transaction: createSwap(),
        assetSymbol: 'USDC',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1',
        bridgeHistoryItem,
      });

      expect(item.type).toBe('swap');
      expect(item.data).toEqual(
        expect.objectContaining({
          sourceToken: expect.objectContaining({
            direction: 'out',
            symbol: 'USDC',
            amount: '10000',
            decimals: 6,
          }),
          destinationToken: expect.objectContaining({
            direction: 'in',
            symbol: 'ETH',
            amount: '3000000000000',
            decimals: 18,
          }),
        }),
      );
    });

    it('degrades to swapIncomplete without the quote, which is the bug this enrichment fixes', () => {
      const item = mapTransactionToActivityItem({
        transaction: createSwap(),
        assetSymbol: 'USDC',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1',
      });

      expect(item.type).toBe('swapIncomplete');
    });

    it('falls back to legacy swapMetaData symbols when there is no quote', () => {
      const item = mapTransactionToActivityItem({
        transaction: createSwap({
          swapMetaData: { token_from: 'USDC', token_to: 'ETH' },
        }),
        assetSymbol: 'USDC',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1',
      });

      expect(item.type).toBe('swap');
      expect(item.data).toEqual(
        expect.objectContaining({
          sourceToken: expect.objectContaining({ symbol: 'USDC' }),
          destinationToken: expect.objectContaining({ symbol: 'ETH' }),
        }),
      );
    });

    it('prefers the quote over legacy symbols, so amounts and decimals survive', () => {
      const item = mapTransactionToActivityItem({
        transaction: createSwap({
          swapMetaData: { token_from: 'STALE', token_to: 'STALE' },
        }),
        assetSymbol: 'USDC',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1',
        bridgeHistoryItem,
      });

      expect(item.data).toEqual(
        expect.objectContaining({
          sourceToken: expect.objectContaining({ symbol: 'USDC' }),
          destinationToken: expect.objectContaining({ symbol: 'ETH' }),
        }),
      );
    });

    it('marks a bridge as successful once the destination leg lands', () => {
      const item = mapTransactionToActivityItem({
        transaction: createSwap({ type: TransactionType.bridge }),
        assetSymbol: 'USDC',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1',
        bridgeHistoryItem: completedBridgeHistoryItem,
      });

      expect(item.type).toBe('bridge');
      expect(item.status).toBe('success');
    });

    it('adds no override while the destination leg is unresolved, so the local status stands', () => {
      const item = mapTransactionToActivityItem({
        transaction: createSwap({
          type: TransactionType.bridge,
          status: TransactionStatus.submitted,
        }),
        assetSymbol: 'USDC',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1',
        bridgeHistoryItem,
      });

      if (item.raw?.type !== 'localTransaction') {
        throw new Error('Expected local transaction activity item');
      }
      expect(item.raw.data.activityStatus).toBeUndefined();
      expect(item.status).toBe('pending');
    });

    it('does not apply the bridge status override to a same-chain swap', () => {
      const item = mapTransactionToActivityItem({
        transaction: createSwap(),
        assetSymbol: 'USDC',
        nativeAssetSymbol: 'ETH',
        currentChainId: '0x1',
        bridgeHistoryItem: completedBridgeHistoryItem,
      });

      if (item.raw?.type !== 'localTransaction') {
        throw new Error('Expected local transaction activity item');
      }
      expect(item.raw.data.activityStatus).toBeUndefined();
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
