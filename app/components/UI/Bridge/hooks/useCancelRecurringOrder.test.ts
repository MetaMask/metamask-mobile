import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager, type InfiniteData } from '@tanstack/query-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import {
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
  MOCK_RECURRING_WALLET_ADDRESS,
} from '../api/recurringOrders.mock';
import {
  type GetRecurringOrdersByAssetResponse,
  RecurringOrderState,
  type GetRecurringOrdersResponse,
  type RecurringOrder,
} from '../api/recurringOrders.types';
import {
  RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
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

const WALLET_ADDRESS = MOCK_RECURRING_WALLET_ADDRESS;

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
  orderStates: RecurringOrderState[] = [RecurringOrderState.Open],
  chainId?: 'eip155:1' | 'eip155:56',
) {
  return recurringOrdersQueries.getRecurringOrders({
    walletAddress,
    orderStates,
    chainId,
    limit: 20,
  }).queryKey;
}

function getByAssetQueryKey(
  assetId = MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
) {
  return recurringOrdersQueries.getRecurringOrdersByAsset({
    walletAddress: WALLET_ADDRESS,
    assetId,
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

  it('updates loaded caches and actively refetches the by-asset query', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const openKey = getQueryKey();
    const historyKey = getQueryKey(WALLET_ADDRESS, [
      RecurringOrderState.Completed,
      RecurringOrderState.Cancelled,
    ]);
    const differentWalletKey = getQueryKey(
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      [RecurringOrderState.Completed, RecurringOrderState.Cancelled],
    );
    const differentChainKey = getQueryKey(
      WALLET_ADDRESS,
      [RecurringOrderState.Completed, RecurringOrderState.Cancelled],
      'eip155:56',
    );
    const differentAssetKey = recurringOrdersQueries.getRecurringOrders({
      walletAddress: WALLET_ADDRESS,
      orderStates: [
        RecurringOrderState.Completed,
        RecurringOrderState.Cancelled,
      ],
      assetId: MOCK_RECURRING_OPEN_ORDER_2.src.asset.assetId,
      limit: 20,
    }).queryKey;
    const byAssetKey = getByAssetQueryKey();
    const differentByAssetKey = getByAssetQueryKey(
      MOCK_RECURRING_OPEN_ORDER_2.src.asset.assetId,
    );
    const existingCancelledOrder = {
      ...MOCK_RECURRING_OPEN_ORDER,
      state: RecurringOrderState.Cancelled,
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
    queryClient.setQueryData(
      differentAssetKey,
      createInfiniteData([MOCK_RECURRING_OPEN_ORDER]),
    );
    queryClient.setQueryData(byAssetKey, [MOCK_RECURRING_OPEN_ORDER]);
    queryClient.setQueryData(differentByAssetKey, [
      MOCK_RECURRING_OPEN_ORDER_2,
    ]);

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
    expect(historyData?.pages[0].orders.map(({ id }) => id)).toStrictEqual([
      MOCK_RECURRING_OPEN_ORDER_2.id,
      MOCK_RECURRING_OPEN_ORDER.id,
    ]);
    expect(
      historyData?.pages[0].orders.find(
        ({ id }) => id === MOCK_RECURRING_OPEN_ORDER.id,
      )?.state,
    ).toBe(RecurringOrderState.Cancelled);
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
      queryClient.getQueryData<InfiniteData<GetRecurringOrdersResponse>>(
        differentAssetKey,
      )?.pages[0].orders,
    ).toStrictEqual([]);
    expect(
      queryClient.getQueryData(
        getQueryKey(WALLET_ADDRESS, [RecurringOrderState.Cancelled]),
      ),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData<GetRecurringOrdersByAssetResponse>(byAssetKey),
    ).toStrictEqual([]);
    expect(
      queryClient.getQueryData<GetRecurringOrdersByAssetResponse>(
        differentByAssetKey,
      ),
    ).toStrictEqual([MOCK_RECURRING_OPEN_ORDER_2]);
    expect(messengerCall).toHaveBeenCalledWith(
      'RecurringOrdersDataService:cancelRecurringOrder',
      MOCK_RECURRING_OPEN_ORDER.id,
      MOCK_RECURRING_OPEN_ORDER.account,
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'RecurringOrdersDataService:invalidateQueries',
      { queryKey: [RECURRING_ORDERS_QUERY_KEY] },
    );
    expect(messengerCall).toHaveBeenCalledWith(
      'RecurringOrdersDataService:invalidateQueries',
      { queryKey: [RECURRING_ORDERS_BY_ASSET_QUERY_KEY] },
    );
    expect(queryClient.getQueryState(openKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(byAssetKey)?.isInvalidated).toBe(true);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [RECURRING_ORDERS_QUERY_KEY],
      refetchType: 'none',
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [RECURRING_ORDERS_BY_ASSET_QUERY_KEY],
      refetchType: 'active',
    });
  });

  it('leaves all caches unchanged when cancellation fails', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const key = getQueryKey();
    const byAssetKey = getByAssetQueryKey();
    const data = createInfiniteData([MOCK_RECURRING_OPEN_ORDER]);
    queryClient.setQueryData(key, data);
    queryClient.setQueryData(byAssetKey, [MOCK_RECURRING_OPEN_ORDER]);
    const before = queryClient.getQueryData(key);
    const byAssetBefore = queryClient.getQueryData(byAssetKey);
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
    expect(queryClient.getQueryData(byAssetKey)).toBe(byAssetBefore);
    expect(messengerCall).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(result.current.error).toHaveProperty('message', 'cancel failed'),
    );
  });

  it('keeps the local move when service invalidation fails', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const key = getQueryKey(WALLET_ADDRESS, [
      RecurringOrderState.Completed,
      RecurringOrderState.Cancelled,
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
        ?.pages[0].orders[0].state,
    ).toBe(RecurringOrderState.Cancelled);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it('keeps the local move when UI cache invalidation fails', async () => {
    const queryClient = new QueryClient();
    queryClients.add(queryClient);
    const key = getQueryKey(WALLET_ADDRESS, [
      RecurringOrderState.Completed,
      RecurringOrderState.Cancelled,
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
        ?.pages[0].orders[0].state,
    ).toBe(RecurringOrderState.Cancelled);
    await waitFor(() => expect(result.current.isSubmitting).toBe(false));
    expect(result.current.error).toBeNull();
  });
});
