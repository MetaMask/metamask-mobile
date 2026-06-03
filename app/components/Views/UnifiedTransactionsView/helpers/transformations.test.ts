import type {
  V1TransactionByHashResponse,
  V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import type { InfiniteData } from '@tanstack/react-query';
import type { ActivityListItem } from '../types';
import {
  isBridgeHistoryForEvmTransaction,
  mergeTransactionsByTime,
  selectApiEvmTransactions,
} from './transformations';

describe('selectApiEvmTransactions', () => {
  const address = '0x0000000000000000000000000000000000000001';
  const otherAddress = '0x0000000000000000000000000000000000000002';

  const buildTransaction = (
    overrides: Partial<V1TransactionByHashResponse> = {},
  ): V1TransactionByHashResponse =>
    ({
      hash: '0xhash',
      timestamp: '2024-01-01T00:00:00Z',
      chainId: 1,
      blockNumber: 100,
      blockHash: '0xblock',
      gas: 21000,
      gasUsed: 21000,
      gasPrice: '1000000000',
      effectiveGasPrice: '1000000000',
      nonce: 0,
      cumulativeGasUsed: 21000,
      value: '1000',
      to: otherAddress,
      from: address,
      ...overrides,
    }) as unknown as V1TransactionByHashResponse;

  const buildData = (
    transactions: V1TransactionByHashResponse[],
  ): InfiniteData<V4MultiAccountTransactionsResponse> =>
    ({
      pages: [{ data: transactions } as V4MultiAccountTransactionsResponse],
      pageParams: [undefined],
    }) as InfiniteData<V4MultiAccountTransactionsResponse>;

  it('transforms transactions into ActivityListItems with hash and chainId', () => {
    const tx = buildTransaction();
    const result = selectApiEvmTransactions({ address })(buildData([tx]));

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].data).toHaveLength(1);
    const [item] = result.pages[0].data;
    expect(item.data.hash).toBe('0xhash');
    expect(item.chainId).toBe('eip155:1');
    expect(item.status).toBeDefined();
    expect(item.type).toBeDefined();
  });

  it('filters out spam token transfers', () => {
    const spam = buildTransaction({
      hash: '0xspam',
      transactionType: 'SPAM_TOKEN_TRANSFER',
    } as Partial<V1TransactionByHashResponse>);
    const normal = buildTransaction({ hash: '0xnormal' });

    const result = selectApiEvmTransactions({ address })(
      buildData([spam, normal]),
    );

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].data.hash).toBe('0xnormal');
  });

  it('filters out transactions unrelated to the address', () => {
    const unrelated = buildTransaction({
      hash: '0xunrelated',
      from: '0x0000000000000000000000000000000000000003',
      to: '0x0000000000000000000000000000000000000004',
    });

    const result = selectApiEvmTransactions({ address })(
      buildData([unrelated]),
    );

    expect(result.pages[0].data).toHaveLength(0);
  });

  it('filters out transactions with excluded hashes', () => {
    const excluded = buildTransaction({ hash: '0xEXCLUDED' });
    const normal = buildTransaction({ hash: '0xnormal' });

    const result = selectApiEvmTransactions({
      address,
      excludedTxHashes: new Set(['0xexcluded']),
    })(buildData([excluded, normal]));

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].data.hash).toBe('0xnormal');
  });

  it('filters incoming token transfers', () => {
    const incomingTokenTransfer = buildTransaction({
      hash: '0xincoming-token',
      from: otherAddress,
      to: address,
      valueTransfers: [
        {
          contractAddress: '0x00000000000000000000000000000000000000aa',
          from: otherAddress,
          to: address,
        },
      ],
    } as Partial<V1TransactionByHashResponse>);
    const outgoing = buildTransaction({ hash: '0xoutgoing' });

    const result = selectApiEvmTransactions({ address })(
      buildData([incomingTokenTransfer, outgoing]),
    );

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].data.hash).toBe('0xoutgoing');
  });

  it('filters incoming native transfers', () => {
    const incomingNativeTransfer = buildTransaction({
      hash: '0xincoming-native',
      from: otherAddress,
      to: address,
      valueTransfers: [
        {
          from: otherAddress,
          to: address,
        },
      ],
    } as Partial<V1TransactionByHashResponse>);
    const outgoing = buildTransaction({ hash: '0xoutgoing' });

    const result = selectApiEvmTransactions({ address })(
      buildData([incomingNativeTransfer, outgoing]),
    );

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].data.hash).toBe('0xoutgoing');
  });

  it('filters zero-value self sends without calldata or transfers', () => {
    const selfSend = buildTransaction({
      from: address,
      to: address,
      value: '0',
      methodId: '0x',
      valueTransfers: [],
    });

    const result = selectApiEvmTransactions({ address })(buildData([selfSend]));

    expect(result.pages[0].data).toHaveLength(0);
  });
});

describe('isBridgeHistoryForEvmTransaction', () => {
  it('matches bridge history by original transaction id', () => {
    const tx = {
      id: 'tx-id',
      actionId: 'action-id',
    };
    const bridgeHistoryValues = [
      {
        txMetaId: 'different-id',
        originalTransactionId: 'action-id',
      },
    ];

    const result = isBridgeHistoryForEvmTransaction(
      tx as Parameters<typeof isBridgeHistoryForEvmTransaction>[0],
      bridgeHistoryValues as Parameters<
        typeof isBridgeHistoryForEvmTransaction
      >[1],
    );

    expect(result).toBe(true);
  });

  it('matches bridge history by source hash', () => {
    const tx = {
      id: 'tx-id',
      hash: '0xABC',
    };
    const bridgeHistoryValues = [
      {
        txMetaId: 'different-id',
        status: {
          srcChain: {
            txHash: '0xabc',
          },
        },
      },
    ];

    const result = isBridgeHistoryForEvmTransaction(
      tx as Parameters<typeof isBridgeHistoryForEvmTransaction>[0],
      bridgeHistoryValues as Parameters<
        typeof isBridgeHistoryForEvmTransaction
      >[1],
    );

    expect(result).toBe(true);
  });
});

describe('mergeTransactionsByTime', () => {
  const makeItem = (overrides: Record<string, unknown>): ActivityListItem =>
    ({
      type: 'send',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1000,
      data: { hash: undefined, from: '0x0', to: '0x1' },
      ...overrides,
    }) as unknown as ActivityListItem;

  it('deduplicates local items by hash when a confirmed item exists', () => {
    const localDuplicate = makeItem({
      timestamp: 300,
      data: { hash: '0xduplicate', from: '0x0', to: '0x1' },
      raw: {
        type: 'localTransaction' as const,
        data: {} as never,
      },
    });
    const localUnique = makeItem({
      timestamp: 200,
      data: { hash: '0xlocal', from: '0x0', to: '0x1' },
      raw: {
        type: 'localTransaction' as const,
        data: {} as never,
      },
    });
    const confirmedDuplicate = makeItem({
      timestamp: 400,
      data: { hash: '0xduplicate', from: '0x0', to: '0x1' },
      raw: {
        type: 'apiEvmTransaction' as const,
        data: {} as never,
      },
    });
    const nonEvm = makeItem({
      chainId: 'bip122:0',
      timestamp: 1,
      data: { hash: 'bip-hash', from: '0x0', to: '0x1' },
      raw: {
        type: 'keyringTransaction' as const,
        data: {} as never,
      },
    });

    const result = mergeTransactionsByTime(
      [localDuplicate, localUnique],
      [confirmedDuplicate],
      [nonEvm],
    );

    // localDuplicate should be deduplicated; result has 3 items
    expect(result).toHaveLength(3);

    // Sorted by timestamp descending
    expect(result[0].data.hash).toBe('0xduplicate');
    expect(result[0].timestamp).toBe(400);

    expect(result[1].data.hash).toBe('0xlocal');
    expect(result[1].timestamp).toBe(200);

    expect(result[2].data.hash).toBe('bip-hash');
    expect(result[2].timestamp).toBe(1);
  });

  it('preserves all items when there are no duplicate hashes', () => {
    const local = makeItem({
      timestamp: 300,
      data: { hash: '0xlocal', from: '0x0', to: '0x1' },
    });
    const confirmed = makeItem({
      timestamp: 400,
      data: { hash: '0xconfirmed', from: '0x0', to: '0x1' },
    });
    const nonEvm = makeItem({
      timestamp: 200,
      data: { hash: 'non-evm', from: '0x0', to: '0x1' },
    });

    const result = mergeTransactionsByTime([local], [confirmed], [nonEvm]);

    expect(result).toHaveLength(3);
    expect(result[0].timestamp).toBe(400);
    expect(result[1].timestamp).toBe(300);
    expect(result[2].timestamp).toBe(200);
  });
});
