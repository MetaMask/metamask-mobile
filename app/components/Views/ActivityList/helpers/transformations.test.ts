import type {
  V1TransactionByHashResponse,
  V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import {
  TransactionStatus as KeyringTransactionStatus,
  TransactionType as KeyringTransactionType,
} from '@metamask/keyring-api';
import type { InfiniteData } from '@tanstack/react-query';
import {
  isBridgeHistoryForEvmTransaction,
  mapNonEvmTransactions,
  mergeTransactionsByTime,
  selectApiEvmTransactions,
  shouldSkipTransaction,
} from './transformations';

const address = '0x0000000000000000000000000000000000000001';
const otherAddress = '0x0000000000000000000000000000000000000002';

const buildTransaction = (
  overrides: Partial<V1TransactionByHashResponse> = {},
): V1TransactionByHashResponse =>
  ({
    hash: '0xhash',
    timestamp: '2026-05-13T14:34:23.000Z',
    chainId: 59144,
    blockNumber: 100,
    blockHash: '0xblock',
    gas: 21000,
    gasUsed: 21000,
    gasPrice: '1000000000',
    effectiveGasPrice: '1000000000',
    nonce: 0,
    cumulativeGasUsed: 21000,
    value: '0',
    to: otherAddress,
    from: address,
    transactionCategory: 'TRANSFER',
    valueTransfers: [],
    ...overrides,
  }) as unknown as V1TransactionByHashResponse;

const buildData = (
  transactions: V1TransactionByHashResponse[],
): InfiniteData<V4MultiAccountTransactionsResponse> =>
  ({
    pages: [
      {
        data: transactions,
        pageInfo: {
          count: transactions.length,
          endCursor: 'next',
          hasNextPage: true,
        },
        unprocessedNetworks: [],
      } as V4MultiAccountTransactionsResponse,
    ],
    pageParams: [undefined],
  }) as InfiniteData<V4MultiAccountTransactionsResponse>;

describe('ActivityList transformations', () => {
  describe('shouldSkipTransaction', () => {
    it('skips excluded hashes, unrelated transactions, spam, and empty self transfers', () => {
      expect(
        shouldSkipTransaction(address, buildTransaction(), new Set(['0xhash'])),
      ).toBe(true);
      expect(
        shouldSkipTransaction(
          address,
          buildTransaction({ from: otherAddress, to: otherAddress }),
        ),
      ).toBe(true);
      expect(
        shouldSkipTransaction(
          address,
          buildTransaction({ transactionType: 'SPAM_TOKEN_TRANSFER' }),
        ),
      ).toBe(true);
      expect(
        shouldSkipTransaction(
          address,
          buildTransaction({
            from: address,
            methodId: '0x',
            to: address,
            value: '0',
            valueTransfers: [],
          }),
        ),
      ).toBe(true);
    });

    it('skips incoming token transfers and keeps normal outgoing transactions', () => {
      expect(
        shouldSkipTransaction(
          address,
          buildTransaction({
            from: otherAddress,
            to: otherAddress,
            valueTransfers: [
              {
                amount: '1000000',
                contractAddress: '0xtoken',
                decimal: 6,
                from: otherAddress,
                name: 'Mock Token',
                symbol: 'MOCK',
                to: address,
                transferType: 'ERC20',
              },
            ],
          }),
        ),
      ).toBe(true);
      expect(shouldSkipTransaction(address, buildTransaction())).toBe(false);
    });

    it('skips incoming native transfers when the account only appears in valueTransfers', () => {
      expect(
        shouldSkipTransaction(
          address,
          buildTransaction({
            from: otherAddress,
            to: otherAddress,
            valueTransfers: [
              {
                amount: '1',
                contractAddress: '',
                decimal: 18,
                from: otherAddress,
                name: 'Ether',
                symbol: 'ETH',
                to: address,
                transferType: 'NATIVE',
              },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('keeps direct incoming token transfers when the indexer omits contractAddress', () => {
      const transaction = buildTransaction({
        from: otherAddress,
        to: address,
        valueTransfers: [
          {
            amount: '1',
            contractAddress: '',
            decimal: 6,
            from: otherAddress,
            name: 'USD Coin',
            symbol: 'USDC',
            to: address,
            transferType: 'ERC20',
          },
        ],
      });

      const result = shouldSkipTransaction(address, transaction);

      expect(result).toBe(false);
    });
  });

  it('matches bridge history by tx ids, original id, and source hash', () => {
    const bridgeHistoryValues = [
      {
        txMetaId: 'meta-id',
        originalTransactionId: 'original-id',
        status: { srcChain: { txHash: '0xBridgeHash' } },
      },
    ];

    expect(
      isBridgeHistoryForEvmTransaction(
        { id: 'meta-id' },
        bridgeHistoryValues as never,
      ),
    ).toBe(true);
    expect(
      isBridgeHistoryForEvmTransaction(
        { actionId: 'original-id' },
        bridgeHistoryValues as never,
      ),
    ).toBe(true);
    expect(
      isBridgeHistoryForEvmTransaction(
        { hash: '0xbridgehash' },
        bridgeHistoryValues as never,
      ),
    ).toBe(true);
    expect(
      isBridgeHistoryForEvmTransaction(
        { hash: '0xother' },
        bridgeHistoryValues as never,
      ),
    ).toBe(false);
  });

  it('selects API EVM transactions while preserving the infinite-query shape', () => {
    const tx = buildTransaction({ hash: '0xkept' });
    const skipped = buildTransaction({ hash: '0xskipped' });
    const select = selectApiEvmTransactions({
      address,
      excludedTxHashes: new Set(['0xskipped']),
    });

    const result = select(buildData([tx, skipped]));

    expect(result.pages[0].pageInfo.endCursor).toBe('next');
    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0]).toMatchObject({
      chainId: 'eip155:59144',
      hash: '0xkept',
      type: 'send',
    });
  });

  it('maps non-EVM transactions and merges by descending timestamp', () => {
    const nonEvmItems = mapNonEvmTransactions([
      {
        id: 'solana-tx',
        chain: 'solana:mainnet',
        from: [
          {
            address: otherAddress,
            asset: {
              amount: '1',
              fungible: true,
              type: 'solana:mainnet/slip44:501',
              unit: 'SOL',
            },
          },
        ],
        status: KeyringTransactionStatus.Confirmed,
        timestamp: 1,
        to: [{ address }],
        type: KeyringTransactionType.Send,
      },
    ] as never);

    expect(nonEvmItems[0].hash).toBe('solana-tx');

    const merged = mergeTransactionsByTime(
      [
        {
          ...nonEvmItems[0],
          timestamp: 1,
        },
      ],
      [
        {
          type: 'receive',
          chainId: 'eip155:1',
          status: 'success',
          timestamp: 3,
          hash: '0xconfirmed',
          data: { from: otherAddress, to: address },
        },
      ],
      [
        {
          type: 'send',
          chainId: 'solana:mainnet',
          status: 'success',
          timestamp: 2,
          hash: '0xnon-evm',
          data: { from: otherAddress, to: address },
        },
      ],
    );

    expect(merged.map((item) => item.timestamp)).toEqual([3, 2, 1]);
  });

  describe('selectApiEvmTransactions', () => {
    it('filters incoming ERC-20 transfers when the account only appears in valueTransfers', () => {
      const incomingTokenTransfer = buildTransaction({
        hash: '0xincoming-token',
        from: otherAddress,
        to: otherAddress,
        valueTransfers: [
          {
            amount: '1',
            contractAddress: '0x3333333333333333333333333333333333333333',
            decimal: 18,
            from: otherAddress,
            symbol: 'aUSDC',
            to: address,
            transferType: 'ERC20',
          },
        ],
      } as Partial<V1TransactionByHashResponse>);

      const result = selectApiEvmTransactions({ address })(
        buildData([incomingTokenTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(0);
    });

    it('filters incoming NFT transfers and handles uppercase transfer types', () => {
      const incomingNftTransfer = buildTransaction({
        hash: '0xincoming-nft',
        from: otherAddress,
        to: otherAddress,
        valueTransfers: [
          {
            amount: '1',
            contractAddress: '0x4444444444444444444444444444444444444444',
            decimal: 0,
            from: otherAddress,
            name: 'NFT',
            symbol: 'NFT',
            to: address,
            transferType: 'ERC721',
          },
        ],
      } as Partial<V1TransactionByHashResponse>);

      const result = selectApiEvmTransactions({ address })(
        buildData([incomingNftTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(0);
    });

    it('still filters incoming native transfers when the account only appears in valueTransfers', () => {
      const incomingNativeTransfer = buildTransaction({
        hash: '0xincoming-native',
        from: otherAddress,
        to: otherAddress,
        valueTransfers: [
          {
            amount: '1',
            contractAddress: '',
            decimal: 18,
            from: otherAddress,
            symbol: 'ETH',
            to: address,
            transferType: 'NATIVE',
          },
        ],
      } as Partial<V1TransactionByHashResponse>);

      const result = selectApiEvmTransactions({ address })(
        buildData([incomingNativeTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(0);
    });

    it('filters ERC-20 value-transfer-only rows that are not direct transfer transactions', () => {
      const contractCallWithIncomingTokenTransfer = buildTransaction({
        hash: '0xcontract-call-incoming-token',
        from: otherAddress,
        to: otherAddress,
        transactionCategory: 'CONTRACT_CALL',
        valueTransfers: [
          {
            amount: '1',
            contractAddress: '0x3333333333333333333333333333333333333333',
            decimal: 18,
            from: otherAddress,
            symbol: 'aUSDC',
            to: address,
            transferType: 'ERC20',
          },
        ],
      } as Partial<V1TransactionByHashResponse>);

      const result = selectApiEvmTransactions({ address })(
        buildData([contractCallWithIncomingTokenTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(0);
    });

    it('filters outgoing value-transfer-only rows where the top-level tx is unrelated', () => {
      const outgoingTokenTransfer = buildTransaction({
        hash: '0xoutgoing-token',
        from: otherAddress,
        to: otherAddress,
        valueTransfers: [
          {
            amount: '1',
            contractAddress: '0x3333333333333333333333333333333333333333',
            decimal: 18,
            from: address,
            symbol: 'aUSDC',
            to: otherAddress,
            transferType: 'ERC20',
          },
        ],
      } as Partial<V1TransactionByHashResponse>);

      const result = selectApiEvmTransactions({ address })(
        buildData([outgoingTokenTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(0);
    });
  });
});
