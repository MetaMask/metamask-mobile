import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getRecurringOrders } from '../api/recurringOrders';
import { MOCK_RECURRING_OPEN_ORDER } from '../api/recurringOrders.mock';
import {
  type GetRecurringOrdersResponse,
  RecurringOrderStatus,
} from '../api/recurringOrders.types';
import { recurringOrdersKeys } from '../queries/recurringOrders';
import { useRecurringOrders } from './useRecurringOrders';

jest.mock('../api/recurringOrders', () => ({
  getRecurringOrders: jest.fn(),
}));

const mockGetRecurringOrders = jest.mocked(getRecurringOrders);
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const OPEN_STATUSES = [RecurringOrderStatus.Open];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
}

function createPage(
  orderId: string,
  nextCursor?: string,
): GetRecurringOrdersResponse {
  return {
    orders: [{ ...MOCK_RECURRING_OPEN_ORDER, orderId }],
    nextCursor,
  };
}

describe('useRecurringOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRecurringOrders.mockResolvedValue(createPage('order-1'));
  });

  it('fetches and exposes the first page', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          status: OPEN_STATUSES,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.orders.map(({ orderId }) => orderId)).toStrictEqual([
      'order-1',
    ]);
    expect(mockGetRecurringOrders).toHaveBeenCalledWith({
      walletAddress: WALLET_ADDRESS,
      status: OPEN_STATUSES,
      chainId: undefined,
      limit: 20,
      cursor: undefined,
    });
  });

  it('forwards the opaque cursor and appends the next page', async () => {
    mockGetRecurringOrders
      .mockResolvedValueOnce(createPage('order-1', 'opaque-cursor'))
      .mockResolvedValueOnce(createPage('order-2'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          status: OPEN_STATUSES,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.orders).toHaveLength(2));

    expect(mockGetRecurringOrders).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'opaque-cursor' }),
    );
    expect(result.current.orders.map(({ orderId }) => orderId)).toStrictEqual([
      'order-1',
      'order-2',
    ]);
  });

  it('ignores duplicate next-page requests while one is pending', async () => {
    let resolveNextPage: (value: GetRecurringOrdersResponse) => void = () =>
      undefined;
    mockGetRecurringOrders
      .mockResolvedValueOnce(createPage('order-1', 'opaque-cursor'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveNextPage = resolve;
          }),
      );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          status: OPEN_STATUSES,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    act(() => {
      result.current.fetchNextPage();
      result.current.fetchNextPage();
    });

    expect(mockGetRecurringOrders).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveNextPage(createPage('order-2'));
    });
    await waitFor(() => expect(result.current.orders).toHaveLength(2));
  });

  it('does not request orders without a wallet or while disabled', () => {
    const { Wrapper } = createWrapper();

    renderHook(
      () =>
        useRecurringOrders({
          status: OPEN_STATUSES,
          enabled: false,
        }),
      { wrapper: Wrapper },
    );

    expect(mockGetRecurringOrders).not.toHaveBeenCalled();
  });

  it('isolates cached pages by wallet, statuses, and chain', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const chainId = 'eip155:1' as const;
    const { result } = renderHook(
      () =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          status: OPEN_STATUSES,
          chainId,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const cachedData = queryClient.getQueryData(
      recurringOrdersKeys.list({
        walletAddress: WALLET_ADDRESS,
        status: OPEN_STATUSES,
        chainId,
      }),
    );

    expect(cachedData).toBeDefined();
    expect(
      queryClient.getQueryData(
        recurringOrdersKeys.list({
          walletAddress: WALLET_ADDRESS,
          status: [RecurringOrderStatus.Completed],
          chainId,
        }),
      ),
    ).toBeUndefined();
  });

  it('surfaces an initial request error and refetches', async () => {
    mockGetRecurringOrders
      .mockRejectedValueOnce(new Error('Request failed'))
      .mockResolvedValueOnce(createPage('order-1'));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useRecurringOrders({
          walletAddress: WALLET_ADDRESS,
          status: OPEN_STATUSES,
        }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.orders).toHaveLength(1);
  });
});
