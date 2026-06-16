import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import {
  isBridgeHistoryForEvmTransaction,
  mapNonEvmTransactions,
  mergeTransactionsByTime,
  selectApiEvmTransactions,
  shouldSkipTransaction,
} from './transformations';
import {
  mapApiEvmTransactions,
  mapKeyringTransaction,
} from '../../../../util/activity-adapters';

jest.mock('../../../../util/activity-adapters', () => ({
  mapApiEvmTransactions: jest.fn(({ transaction }) => ({
    type: 'send',
    chainId: `eip155:${transaction.chainId}`,
    status: 'success',
    timestamp: Date.parse(transaction.timestamp),
    data: { hash: transaction.hash },
    raw: { type: 'apiEvmTransaction', data: transaction },
  })),
  mapKeyringTransaction: jest.fn(({ transaction }) => ({
    type: 'send',
    chainId: transaction.chain,
    status: 'success',
    timestamp: 1,
    data: { hash: transaction.id },
    raw: { type: 'keyringTransaction', data: transaction },
  })),
}));

const address = '0x9bed78535d6a03a955f1504aadba974d9a29e292';
const otherAddress = '0x80181d3ba89220cdb80234fc7aa19d5cc56229cc';

const makeTx = (
  overrides: Partial<V1TransactionByHashResponse> = {},
): V1TransactionByHashResponse =>
  ({
    chainId: 1,
    from: address,
    hash: '0xhash',
    methodId: '0x',
    timestamp: '2026-01-01T00:00:00.000Z',
    to: otherAddress,
    value: '1',
    valueTransfers: [],
    ...overrides,
  }) as unknown as V1TransactionByHashResponse;

describe('ActivityList transformations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shouldSkipTransaction', () => {
    it('skips excluded hashes, unrelated transactions, spam, and empty self transfers', () => {
      expect(
        shouldSkipTransaction(address, makeTx(), new Set(['0xhash'])),
      ).toBe(true);
      expect(
        shouldSkipTransaction(
          address,
          makeTx({ from: otherAddress, to: otherAddress }),
        ),
      ).toBe(true);
      expect(
        shouldSkipTransaction(
          address,
          makeTx({ transactionType: 'SPAM_TOKEN_TRANSFER' }),
        ),
      ).toBe(true);
      expect(
        shouldSkipTransaction(
          address,
          makeTx({
            from: address,
            methodId: '0x',
            to: address,
            value: '0',
            valueTransfers: [],
          }),
        ),
      ).toBe(true);
    });

    it('skips incoming transfers already handled by local sources and keeps normal outgoing transactions', () => {
      expect(
        shouldSkipTransaction(
          address,
          makeTx({
            from: otherAddress,
            to: address,
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
      expect(
        shouldSkipTransaction(
          address,
          makeTx({
            from: otherAddress,
            to: address,
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
      expect(shouldSkipTransaction(address, makeTx())).toBe(false);
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

  it('selects and maps API EVM transactions while preserving the infinite-query shape', () => {
    const tx = makeTx({ hash: '0xkept' });
    const skipped = makeTx({ hash: '0xskipped' });
    const select = selectApiEvmTransactions({
      address,
      excludedTxHashes: new Set(['0xskipped']),
    });

    const result = select({
      pageParams: [undefined],
      pages: [
        {
          data: [tx, skipped],
          pageInfo: {
            count: 2,
            endCursor: 'next',
            hasNextPage: true,
          },
          unprocessedNetworks: [],
        },
      ],
    } as never);

    expect(result.pages[0].pageInfo.endCursor).toBe('next');
    expect(result.pages[0].data).toHaveLength(1);
    expect(mapApiEvmTransactions).toHaveBeenCalledWith({
      subjectAddress: address.toLowerCase(),
      transaction: tx,
      environment: undefined,
    });
  });

  it('maps non-EVM transactions and merges by descending timestamp', () => {
    const nonEvmItems = mapNonEvmTransactions([
      { id: 'solana-tx', chain: 'solana:mainnet' },
    ] as never);

    expect(mapKeyringTransaction).toHaveBeenCalledWith({
      transaction: { id: 'solana-tx', chain: 'solana:mainnet' },
    });
    expect(nonEvmItems[0].data.hash).toBe('solana-tx');

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
          data: { from: otherAddress, hash: '0xconfirmed', to: address },
        },
      ],
      [
        {
          type: 'send',
          chainId: 'solana:mainnet',
          status: 'success',
          timestamp: 2,
          data: { from: otherAddress, hash: '0xnon-evm', to: address },
        },
      ],
    );

    expect(merged.map((item) => item.timestamp)).toEqual([3, 2, 1]);
  });
});
