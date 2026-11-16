import { renderHook, act } from '@testing-library/react-hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { apiClient } from '../../../core/apiClient';
import { useTransactionsQuery } from './useTransactionsQuery';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useInfiniteQuery: jest.fn((options) => options),
}));

jest.mock('../../../core/apiClient', () => ({
  apiClient: {
    accounts: {
      getV5MultiAccountTransactionsInfiniteQueryOptions: jest.fn(() => ({
        queryKey: ['transactions'],
        queryFn: jest.fn(),
      })),
    },
  },
}));

jest.mock('./helpers/transformations', () => ({
  selectApiEvmTransactions: jest.fn((args) => ({ selectorArgs: args })),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockUseInfiniteQuery = useInfiniteQuery as unknown as jest.Mock;

function mockQuerySelectors({
  networks = ['eip155:1', 'eip155:137'],
}: {
  networks?: string[];
} = {}) {
  mockUseSelector
    .mockReturnValueOnce({ address: '0xGroupAddress' })
    .mockReturnValueOnce('0xGlobalAddress')
    .mockReturnValueOnce(networks)
    .mockReturnValueOnce(new Set());
}

describe('useTransactionsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInfiniteQuery.mockImplementation((options) => options);
  });

  it('uses the selected account-group EVM address and configured networks', () => {
    const excludedTxHashes = new Set(['0xskip']);
    mockUseSelector
      .mockReturnValueOnce({ address: '0xGroupAddress' })
      .mockReturnValueOnce('0xGlobalAddress')
      .mockReturnValueOnce(['eip155:1'])
      .mockReturnValueOnce(excludedTxHashes);

    renderHook(() => useTransactionsQuery());

    expect(
      apiClient.accounts.getV5MultiAccountTransactionsInfiniteQueryOptions,
    ).toHaveBeenCalledWith({
      accountIds: ['eip155:0:0xGroupAddress'],
      networks: ['eip155:1'],
      includeTxMetadata: true,
    });
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        retry: false,
        select: {
          selectorArgs: {
            address: '0xGroupAddress',
            excludedTxHashes,
          },
        },
      }),
    );
  });

  it('falls back to the global EVM address and disables the query without networks', () => {
    mockUseSelector
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('0xGlobalAddress')
      .mockReturnValueOnce([])
      .mockReturnValueOnce(new Set());

    renderHook(() => useTransactionsQuery());

    expect(
      apiClient.accounts.getV5MultiAccountTransactionsInfiniteQueryOptions,
    ).toHaveBeenCalledWith({
      accountIds: ['eip155:0:0xGlobalAddress'],
      networks: [],
      includeTxMetadata: true,
    });
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('does not request account addresses when no EVM address exists', () => {
    mockUseSelector
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce(['eip155:1'])
      .mockReturnValueOnce(new Set());

    renderHook(() => useTransactionsQuery());

    expect(
      apiClient.accounts.getV5MultiAccountTransactionsInfiniteQueryOptions,
    ).toHaveBeenCalledWith({
      accountIds: [],
      networks: ['eip155:1'],
      includeTxMetadata: true,
    });
    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('stays disabled when the caller has no asset to show', () => {
    mockQuerySelectors();

    renderHook(() => useTransactionsQuery({ enabled: false }));

    expect(useInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('requests only the asset chain when an asset id is set', () => {
    mockQuerySelectors();

    renderHook(() =>
      useTransactionsQuery({ assetId: 'eip155:137/erc20:0xabc' }),
    );

    expect(
      apiClient.accounts.getV5MultiAccountTransactionsInfiniteQueryOptions,
    ).toHaveBeenCalledWith({
      accountIds: ['eip155:0:0xGroupAddress'],
      networks: ['eip155:137'],
      includeTxMetadata: true,
    });
  });

  it('keeps paging past a matching page until the requested row count', async () => {
    const pages = [
      { data: [] },
      { data: [{ hash: '0x1' }] },
      { data: [] },
      { data: [{ hash: '0x2' }, { hash: '0x3' }] },
    ];
    let pageIndex = 1;
    const fetchNextPage = jest.fn(async () => {
      pageIndex += 1;
      return {
        hasNextPage: pageIndex < pages.length,
        data: { pages: pages.slice(0, pageIndex) },
      };
    });
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: pages.slice(0, 1) },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    mockQuerySelectors();

    const { result } = renderHook(() =>
      useTransactionsQuery({ assetId: 'eip155:1/erc20:0xabc' }),
    );

    await act(async () => {
      await result.current.fetchNextVisiblePage({ minVisibleItems: 3 });
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(3);
  });

  it('stops paging when a fetch adds no page', async () => {
    const fetchNextPage = jest.fn(async () => ({
      hasNextPage: true,
      data: { pages: [{ data: [] }] },
    }));
    mockUseInfiniteQuery.mockReturnValue({
      data: { pages: [{ data: [] }] },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    mockQuerySelectors();

    const { result } = renderHook(() => useTransactionsQuery());

    await act(async () => {
      await result.current.fetchNextVisiblePage({ minVisibleItems: 3 });
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });
});
