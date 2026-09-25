import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager, type InfiniteData } from '@tanstack/query-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
} from '../api/recurringOrders.mock';
import {
  RecurringOrderStatus,
  type GetRecurringOrdersResponse,
  type RecurringOrder,
} from '../api/recurringOrders.types';
import {
  RECURRING_ORDERS_QUERY_KEY,
  recurringOrdersQueries,
} from '../queries/recurringOrders';
import { useCancelRecurringOrder } from './useCancelRecurringOrder';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});
notifyManager.setNotifyFunction((callback) => {
  act(callback);
});

const WALLET_ADDRESS = MOCK_RECURRING_OPEN_ORDER.src.walletAddress;

function createInfiniteData(
  orders: RecurringOrder[],
  nextCursor?: string,
): InfiniteData<GetRecurringOrdersResponse> {
  return {
    pages: [{ orders, ...(nextCursor ? { nextCursor } : {}) }],
    pageParams: [undefined],
  };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

function getQueryKey(
  walletAddress = WALLET_ADDRESS,
  status = [RecurringOrderStatus.Open],
  chainId?: 'eip155:1' | 'eip155:56',
) {
  return recurringOrdersQueries.getRecurringOrders({
    walletAddress,
    status,
    chainId,
    limit: 20,
  }).queryKey;
}

describe('useCancelRecurringOrder', () => {
  const messengerCall = Engine.controllerMessenger.call as jest.Mock;
  const queryClients = new Set<QueryClient>();

  beforeEach(() => {
    messengerCall.mockReset();
    messengerCall.mockResolvedValue(undefined);
  });

  afterEach(() => {
    queryClients.forEach((queryClient) => queryClient.clear());
    queryClients.clear();
  });

  it('moves loaded data into matching History caches and invalidates without refetching', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const openKey = getQueryKey();
    const historyKey = getQueryKey(WALLET_ADDRESS, [
      RecurringOrderStatus.Completed,
      RecurringOrderStatus.Cancelled,
    ]);
    const differentWalletKey = getQueryKey(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      [RecurringOrderStatus.Completed, RecurringOrderStatus.Cancelled],
    );
    const differentChainKey = getQueryKey(
      WALLET_ADDRESS,
      [RecurringOrderStatus.Completed, RecurringOrderStatus.Cancelled],
      'eip155:56',
    );
    const existingCancelledOrder = {
      ...MOCK_RECURRING_OPEN_ORDER,
      status: RecurringOrderStatus.Cancelled,
    };

    queryClient.setQueryData(openKey, {
      pages: [
        createInfiniteData([MOCK_RECURRING_OPEN_ORDER], 'cursor').pages[0],
        createInfiniteData([MOCK_RECURRING_OPEN_ORDER]).pages[0],
      ],
      pageParams: [undefined, 'cursor'],
    });
    queryClient.setQueryData(
      historyKey,
      createInfiniteData([existingCancelledOrder, MOCK_RECURRING_OPEN_ORDER_2]),
    );
    queryClient.setQueryData(
      differentWalletKey,
      createInfiniteData([MOCK_RECURRING_OPEN_ORDER]),
    );
    queryClient.setQueryData(
      differentChainKey,
      createInfiniteData([MOCK_RECURRING_OPEN_ORDER]),
    );

    const { result } = renderHook(() => useCancelRecurringOrder(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER);
    });

    const openData =
      queryClient.getQueryData<InfiniteData<GetRecurringOrdersResponse>>(
        openKey,
      );
    const historyData =
      queryClient.getQueryData<InfiniteData<GetRecurringOrdersResponse>>(
        historyKey,
      );

    expect(openData?.pages.flatMap((page) => page.orders)).toHaveLength(0);
    expect(
      historyData?.pages[0].orders.map(({ orderId }) => orderId),
    ).toStrictEqual([
      MOCK_RECURRING_OPEN_ORDER_2.orderId,
      MOCK_RECURRING_OPEN_ORDER.orderId,
    ]);
    expect(
      historyData?.pages[0].orders.find(
        ({ orderId }) => orderId === MOCK_RECURRING_OPEN_ORDER.orderId,
      )?.status,
    ).toBe(RecurringOrderStatus.Cancelled);
    expect(
      queryClient.getQueryData<InfiniteData<GetRecurringOrdersResponse>>(
        differentWalletKey,
      )?.pages[0].orders,
    ).toStrictEqual([]);
    expect(
      queryClient.getQueryData<InfiniteData<GetRecurringOrdersResponse>>(
        differentChainKey,
      )?.pages[0].orders,
    ).toStrictEqual([]);
    expect(
      queryClient.getQueryData(
        getQueryKey(WALLET_ADDRESS, [RecurringOrderStatus.Cancelled]),
      ),
    ).toBeUndefined();
    expect(messengerCall).toHaveBeenCalledWith(
      'RecurringOrdersDataService:cancelRecurringOrder',
      MOCK_RECURRING_OPEN_ORDER.orderId,
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'RecurringOrdersDataService:invalidateQueries',
      { queryKey: [RECURRING_ORDERS_QUERY_KEY] },
    );
    expect(queryClient.getQueryState(openKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(true);
  });

  it('leaves all caches unchanged when cancellation fails', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const key = getQueryKey();
    const data = createInfiniteData([MOCK_RECURRING_OPEN_ORDER]);
    queryClient.setQueryData(key, data);
    const before = queryClient.getQueryData(key);
    messengerCall.mockRejectedValue(new Error('cancel failed'));

    const { result } = renderHook(() => useCancelRecurringOrder(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER),
      ).rejects.toThrow('cancel failed');
    });

    expect(queryClient.getQueryData(key)).toBe(before);
    expect(messengerCall).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(result.current.error).toHaveProperty('message', 'cancel failed'),
    );
  });

  it('keeps the local move when service invalidation fails', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const key = getQueryKey(WALLET_ADDRESS, [
      RecurringOrderStatus.Completed,
      RecurringOrderStatus.Cancelled,
    ]);
    queryClient.setQueryData(key, createInfiniteData([]));
    messengerCall
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('service unavailable'));

    const { result } = renderHook(() => useCancelRecurringOrder(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER);
    });

    expect(
      queryClient.getQueryData<InfiniteData<GetRecurringOrdersResponse>>(key)
        ?.pages[0].orders[0].status,
    ).toBe(RecurringOrderStatus.Cancelled);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('keeps the local move when UI cache invalidation fails', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const key = getQueryKey(WALLET_ADDRESS, [
      RecurringOrderStatus.Completed,
      RecurringOrderStatus.Cancelled,
    ]);
    queryClient.setQueryData(key, createInfiniteData([]));
    jest
      .spyOn(queryClient, 'invalidateQueries')
      .mockRejectedValueOnce(new Error('UI cache unavailable'));

    const { result } = renderHook(() => useCancelRecurringOrder(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.cancelRecurringOrder(MOCK_RECURRING_OPEN_ORDER);
    });

    expect(
      queryClient.getQueryData<InfiniteData<GetRecurringOrdersResponse>>(key)
        ?.pages[0].orders[0].status,
    ).toBe(RecurringOrderStatus.Cancelled);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(result.current.error).toBeNull();
  });
});
