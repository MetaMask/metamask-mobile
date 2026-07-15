import type {
  V1TransactionByHashResponse,
  V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import type { InfiniteData } from '@tanstack/react-query';
import {
  isBridgeHistoryForEvmTransaction,
  mergeTransactionsByTime,
  selectTransactions,
} from './transformations';
import { TransactionKind } from '../types';

describe('selectTransactions', () => {
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

  it('transforms transactions into view models with id and transactionMeta', () => {
    const tx = buildTransaction();
    const result = selectTransactions({ address })(buildData([tx]));

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].data).toHaveLength(1);
    const [viewModel] = result.pages[0].data;
    expect(viewModel.id).toBe('0xhash-1');
    expect(viewModel.hexChainId).toBe('0x1');
    expect(viewModel.transactionMeta).toBeDefined();
    expect(viewModel.hash).toBe('0xhash');
  });

  it('filters out spam token transfers', () => {
    const spam = buildTransaction({
      hash: '0xspam',
      transactionType: 'SPAM_TOKEN_TRANSFER',
    } as Partial<V1TransactionByHashResponse>);
    const normal = buildTransaction({ hash: '0xnormal' });

    const result = selectTransactions({ address })(buildData([spam, normal]));

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].hash).toBe('0xnormal');
  });

  it('filters out transactions unrelated to the address', () => {
    const unrelated = buildTransaction({
      hash: '0xunrelated',
      from: '0x0000000000000000000000000000000000000003',
      to: '0x0000000000000000000000000000000000000004',
    });

    const result = selectTransactions({ address })(buildData([unrelated]));

    expect(result.pages[0].data).toHaveLength(0);
  });

  it('filters out transactions with excluded hashes', () => {
    const excluded = buildTransaction({ hash: '0xEXCLUDED' });
    const normal = buildTransaction({ hash: '0xnormal' });

    const result = selectTransactions({
      address,
      excludedTxHashes: new Set(['0xexcluded']),
    })(buildData([excluded, normal]));

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].hash).toBe('0xnormal');
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

    const result = selectTransactions({ address })(
      buildData([incomingTokenTransfer, outgoing]),
    );

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].hash).toBe('0xoutgoing');
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

    const result = selectTransactions({ address })(
      buildData([incomingNativeTransfer, outgoing]),
    );

    expect(result.pages[0].data).toHaveLength(1);
    expect(result.pages[0].data[0].hash).toBe('0xoutgoing');
  });

  it('filters zero-value self sends without calldata or transfers', () => {
    const selfSend = buildTransaction({
      from: address,
      to: address,
      value: '0',
      methodId: '0x',
      valueTransfers: [],
    });

    const result = selectTransactions({ address })(buildData([selfSend]));

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
  it('sorts unified transactions by time and removes local transactions with confirmed hashes', () => {
    const localDuplicate = {
      id: 'local-duplicate',
      hash: '0xDUPLICATE',
      time: 300,
    };
    const localUnique = {
      id: 'local-unique',
      hash: '0xlocal',
      time: 200,
    };
    const confirmedDuplicate = {
      id: 'confirmed-duplicate',
      hash: '0xduplicate',
      time: 400,
    };
    const nonEvm = {
      id: 'non-evm',
      timestamp: 1,
    };

    const result = mergeTransactionsByTime(
      [localDuplicate, localUnique] as Parameters<
        typeof mergeTransactionsByTime
      >[0],
      [confirmedDuplicate] as Parameters<typeof mergeTransactionsByTime>[1],
      [nonEvm] as Parameters<typeof mergeTransactionsByTime>[2],
    );

    expect(result).toStrictEqual([
      {
        kind: TransactionKind.NonEvm,
        tx: nonEvm,
        time: 1000,
      },
      {
        kind: TransactionKind.ConfirmedEvm,
        tx: confirmedDuplicate,
        time: 400,
      },
      {
        kind: TransactionKind.Evm,
        tx: localUnique,
        time: 200,
      },
    ]);
  });
});
