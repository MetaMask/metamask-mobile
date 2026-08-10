import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { useSelector } from 'react-redux';
import { useCardTransactions } from './useCardTransactions';
import Engine from '../../../../core/Engine';
import type { CardTransactionPage } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectCardActiveProviderId,
  selectCardProviderUserId,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import { cardQueries } from '../queries';

// Override React Query's batch notify function to prevent teardown crashes.
// The default uses react-native's unstable_batchedUpdates which tries to
// require() internal modules after the Jest environment is torn down.
notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

const mockListTransactions = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      listTransactions: jest.fn(),
    },
  },
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
let mockIsAuthenticated = true;
let mockProviderId: string | null = 'baanx';
let mockProviderUserId: string | null = 'user-1';

let activeQueryClient: QueryClient | null = null;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  activeQueryClient = queryClient;
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const buildTransaction = (id: string) => ({
  id,
  providerId: 'baanx',
  timestamp: 1728902676276,
  status: 'completed',
  type: 'purchase',
  isDebit: true,
  billingAmount: { value: '0.79', currency: 'EUR' },
  merchant: { name: 'WWW.ALIEXPRESS.COM', city: 'LONDON' },
  fundingSources: [
    { txHash: `0xhash-${id}`, address: '0xwallet', chainId: 'eip155:59144' },
  ],
});

const buildPage = (
  ids: string[],
  nextCursor?: string,
): CardTransactionPage => ({
  items: ids.map(buildTransaction) as CardTransactionPage['items'],
  nextCursor,
});

describe('useCardTransactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockProviderId = 'baanx';
    mockProviderUserId = 'user-1';
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsCardAuthenticated) {
        return mockIsAuthenticated;
      }
      if (selector === selectCardActiveProviderId) {
        return mockProviderId;
      }
      if (selector === selectCardProviderUserId) {
        return mockProviderUserId;
      }
      return undefined;
    });
    mockListTransactions.mockResolvedValue(buildPage(['tx-1']));
    (Engine.context.CardController.listTransactions as jest.Mock) =
      mockListTransactions;
  });

  afterEach(() => {
    if (activeQueryClient) {
      activeQueryClient.getQueryCache().clear();
      activeQueryClient.clear();
      activeQueryClient = null;
    }
  });

  it('fetches the first page without a cursor and returns its items', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListTransactions).toHaveBeenCalledWith({
      limit: 20,
      cursor: undefined,
      searchQuery: undefined,
      fromDate: undefined,
      toDate: undefined,
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('tx-1');
    expect(result.current.hasMore).toBe(false);
  });

  it('loads the next page with the returned cursor and flattens items', async () => {
    mockListTransactions
      .mockResolvedValueOnce(buildPage(['tx-1'], 'cursor-1'))
      .mockResolvedValueOnce(buildPage(['tx-2']));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    expect(mockListTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-1' }),
    );
    expect(result.current.items.map((tx) => tx.id)).toStrictEqual([
      'tx-1',
      'tx-2',
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not fetch when there are no more pages', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.loadMore();
    });

    expect(mockListTransactions).toHaveBeenCalledTimes(1);
  });

  it('debounces the search query before refetching', async () => {
    jest.useFakeTimers();
    try {
      const { Wrapper } = createWrapper();

      const { result, rerender } = renderHook(
        ({ searchQuery }: { searchQuery?: string }) =>
          useCardTransactions({ searchQuery }),
        {
          wrapper: Wrapper,
          initialProps: { searchQuery: undefined as string | undefined },
        },
      );
      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      rerender({ searchQuery: 'uber' });
      // Not yet debounced: no new request with the search term.
      expect(mockListTransactions).not.toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'uber' }),
      );

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      expect(mockListTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'uber' }),
      );
      expect(result.current).toBeDefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('passes fromDate and toDate through to the controller', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useCardTransactions({ fromDate: 1000, toDate: 2000 }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: 1000, toDate: 2000 }),
    );
  });

  it('surfaces controller errors', async () => {
    const authError = new Error('Not authenticated');
    mockListTransactions.mockRejectedValue(authError);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.error).toBe(authError));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not fetch or expose cached transactions while unauthenticated', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(
      cardQueries.transactions.keys.list(
        'baanx',
        'user-1',
        '',
        undefined,
        undefined,
      ),
      {
        pages: [buildPage(['cached-tx'])],
        pageParams: [undefined],
      },
    );
    mockIsAuthenticated = false;

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData(
          cardQueries.transactions.keys.list(
            'baanx',
            'user-1',
            '',
            undefined,
            undefined,
          ),
        ),
      ).toBeUndefined(),
    );
    expect(mockListTransactions).not.toHaveBeenCalled();
    expect(result.current.items).toStrictEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('uses provider- and user-scoped query keys', async () => {
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      queryClient.getQueryData(
        cardQueries.transactions.keys.list(
          'baanx',
          'user-1',
          '',
          undefined,
          undefined,
        ),
      ),
    ).toBeDefined();
    expect(
      queryClient.getQueryData(
        cardQueries.transactions.keys.list(
          'immersve',
          'user-1',
          '',
          undefined,
          undefined,
        ),
      ),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(
        cardQueries.transactions.keys.list(
          'baanx',
          'user-2',
          '',
          undefined,
          undefined,
        ),
      ),
    ).toBeUndefined();
  });

  it('reports isLoadingMore only while a follow-up page is in flight', async () => {
    let resolveSecondPage: (page: CardTransactionPage) => void = () =>
      undefined;
    mockListTransactions
      .mockResolvedValueOnce(buildPage(['tx-1'], 'cursor-1'))
      .mockReturnValueOnce(
        new Promise<CardTransactionPage>((resolve) => {
          resolveSecondPage = resolve;
        }),
      );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactions(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.hasMore).toBe(true));
    expect(result.current.isLoadingMore).toBe(false);

    act(() => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(true));

    await act(async () => {
      resolveSecondPage(buildPage(['tx-2']));
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
  });
});
