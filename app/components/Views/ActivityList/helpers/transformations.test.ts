import type {
  V1TransactionByHashResponse,
  V5MultiAccountTransactionsResponse,
  V5TransactionRecord,
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
  shouldSkipUnrelatedTransaction,
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

const buildV5Transaction = (
  overrides: {
    id?: string;
    from?: string;
    to?: string | null;
    value?: string;
    methodId?: string;
    valueTransfers?: V5TransactionRecord['valueTransfers'];
  } = {},
): V5TransactionRecord => ({
  accountId: `eip155:59144:${address}`,
  tx: {
    id: overrides.id ?? '0xhash',
    chainId: 'eip155:59144',
    status: 'confirmed',
    timestamp: 1778593067000,
    date: '2026-05-12T13:37:47.000Z',
    from: overrides.from ?? address,
    to: overrides.to ?? otherAddress,
    blockNumber: '1',
    blockHash: '0xblock',
    value: overrides.value ?? '0',
    methodId: overrides.methodId,
    transactionCategory: 'TRANSFER',
  },
  valueTransfers: overrides.valueTransfers ?? [],
  fee: null,
});

const buildV5Data = (
  transactions: V5TransactionRecord[],
): InfiniteData<V5MultiAccountTransactionsResponse> =>
  ({
    pages: [
      {
        data: transactions,
        pageInfo: {
          count: transactions.length,
          endCursor: 'next',
          hasNextPage: true,
        },
        unprocessedAccounts: [],
      } as V5MultiAccountTransactionsResponse,
    ],
    pageParams: [undefined],
  }) as InfiniteData<V5MultiAccountTransactionsResponse>;

describe('ActivityList transformations', () => {
  describe('shouldSkipTransaction', () => {
    it('skips excluded hashes, unrelated transactions, and empty self transfers', () => {
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

    it('keeps incoming token transfers where the address is a direct recipient', () => {
      const directTokenReceive = buildTransaction({
        from: otherAddress,
        to: address,
        valueTransfers: [
          {
            amount: '1000000',
            contractAddress: '0x3333333333333333333333333333333333333333',
            decimal: 6,
            from: otherAddress,
            name: 'USD Coin',
            symbol: 'USDC',
            to: address,
            transferType: 'ERC20',
          },
        ],
      });

      expect(shouldSkipTransaction(address, directTokenReceive)).toBe(false);
    });
  });

  describe('shouldSkipUnrelatedTransaction', () => {
    it('keeps direct receives that the list gate drops via their value transfers', () => {
      const tokenReceive = buildTransaction({
        from: otherAddress,
        to: address,
        value: '0',
        valueTransfers: [
          {
            amount: '1000000',
            contractAddress: '0x3333333333333333333333333333333333333333',
            decimal: 6,
            from: otherAddress,
            name: 'USD Coin',
            symbol: 'USDC',
            to: address,
            transferType: 'ERC20',
          },
        ],
      });

      expect(shouldSkipUnrelatedTransaction(address, tokenReceive)).toBe(false);
    });

    it('still skips excluded hashes, non-participant, and empty self transfers', () => {
      expect(
        shouldSkipUnrelatedTransaction(
          address,
          buildTransaction(),
          new Set(['0xhash']),
        ),
      ).toBe(true);
      expect(
        shouldSkipUnrelatedTransaction(
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
      expect(
        shouldSkipUnrelatedTransaction(
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
      expect(shouldSkipUnrelatedTransaction(address, buildTransaction())).toBe(
        false,
      );
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
    const tx = buildV5Transaction({ id: '0xkept', value: '1' });
    const skipped = buildV5Transaction({ id: '0xskipped', value: '1' });
    const select = selectApiEvmTransactions({
      address,
      excludedTxHashes: new Set(['0xskipped']),
    });

    const result = select(buildV5Data([tx, skipped]));

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

  it('maps a Tron stake to the staking kind rather than a contract interaction', () => {
    const nonEvmItems = mapNonEvmTransactions([
      {
        id: 'tron-stake',
        chain: 'tron:728126428',
        from: [
          {
            address,
            asset: {
              amount: '100',
              fungible: true,
              type: 'tron:728126428/slip44:195',
              unit: 'TRX',
            },
          },
        ],
        status: KeyringTransactionStatus.Confirmed,
        timestamp: 1,
        to: [],
        type: KeyringTransactionType.StakeDeposit,
      },
    ] as never);

    expect(nonEvmItems[0]).toMatchObject({
      type: 'stake',
      hash: 'tron-stake',
      data: { token: { symbol: 'TRX', amount: '100', direction: 'out' } },
    });
  });

  describe('selectApiEvmTransactions', () => {
    it('drops legacy v4 records instead of failing the activity query', () => {
      const legacyRecord = {
        hash: '0xlegacy',
        from: address,
        to: otherAddress,
        value: '0',
        valueTransfers: [],
      };

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([legacyRecord as unknown as V5TransactionRecord]),
      );

      expect(result.pages[0].data).toEqual([]);
    });

    it('filters outgoing value-transfer-only rows where the top-level tx is unrelated', () => {
      const outgoingTokenTransfer = buildV5Transaction({
        id: '0xoutgoing-token',
        from: otherAddress,
        to: otherAddress,
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: otherAddress,
            assetId:
              'eip155:59144/erc20:0x3333333333333333333333333333333333333333',
            amount: '1',
            decimal: 18,
            symbol: 'aUSDC',
          },
        ],
      });

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([outgoingTokenTransfer]),
      );

      expect(result.pages[0].data).toHaveLength(0);
    });

    it('classifies pooled-staking calls instead of leaving them as contract interactions', () => {
      const pool = '0x4fef9d741011476750a243ac70b9789a63dd47df';
      const stakeDeposit = buildV5Transaction({
        id: '0xstake',
        to: pool,
        methodId: '0xf9609f08',
        value: '1000000000000000000',
        valueTransfers: [
          {
            assetClass: 'ft',
            from: address,
            to: pool,
            assetId: 'eip155:1/slip44:60',
            amount: '1000000000000000000',
            decimal: 18,
            symbol: 'ETH',
          },
        ],
      });
      stakeDeposit.tx.chainId = 'eip155:1';
      stakeDeposit.accountId = `eip155:1:${address}`;

      const result = selectApiEvmTransactions({ address })(
        buildV5Data([stakeDeposit]),
      );

      expect(result.pages[0].data[0]).toMatchObject({
        chainId: 'eip155:1',
        hash: '0xstake',
        type: 'stake',
        data: {
          token: {
            amount: '1000000000000000000',
            assetId: 'eip155:1/slip44:60',
            direction: 'out',
            symbol: 'ETH',
          },
        },
      });
    });
  });
});
