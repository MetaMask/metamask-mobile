import type {
  V1TransactionByHashResponse,
  V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import type { InfiniteData } from '@tanstack/react-query';
import { selectTransactions } from './transformations';

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
});
