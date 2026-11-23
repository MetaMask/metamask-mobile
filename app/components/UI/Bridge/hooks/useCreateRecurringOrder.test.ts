import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { recurringOrdersApiClient } from '../api/recurringOrders.client';
import {
  createMockPrepareRecurringDelegationResponse,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_PREPARE_QUERY,
} from '../api/recurringOrders.mock';
import type { CreateRecurringOrderRequest } from '../api/recurringOrders.types';
import {
  RECURRING_ORDERS_BY_ASSET_QUERY_KEY,
  RECURRING_ORDERS_QUERY_KEY,
} from '../queries/recurringOrders';
import { useCreateRecurringOrder } from './useCreateRecurringOrder';

jest.mock('../api/recurringOrders.client', () => ({
  recurringOrdersApiClient: {
    createRecurringOrder: jest.fn(),
  },
}));

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});
notifyManager.setNotifyFunction((callback) => {
  act(callback);
});

const request: CreateRecurringOrderRequest = {
  accountAddress: MOCK_RECURRING_PREPARE_QUERY.accountAddress,
  clientOrderId: MOCK_RECURRING_PREPARE_QUERY.clientOrderId,
  src: {
    assetId: MOCK_RECURRING_PREPARE_QUERY.srcAssetId,
    amount: MOCK_RECURRING_PREPARE_QUERY.srcAmount,
  },
  dest: {
    assetId: MOCK_RECURRING_PREPARE_QUERY.destAssetId,
  },
  priceTolerance: 3,
  schedule: {
    every: MOCK_RECURRING_PREPARE_QUERY.every,
    unit: MOCK_RECURRING_PREPARE_QUERY.unit,
    repeatCount: MOCK_RECURRING_PREPARE_QUERY.repeatCount,
  },
  delegations: createMockPrepareRecurringDelegationResponse(
    MOCK_RECURRING_PREPARE_QUERY,
  ).delegations,
};

describe('useCreateRecurringOrder', () => {
  it('creates the order and invalidates service and UI caches', async () => {
    const messengerCall = Engine.controllerMessenger.call as jest.Mock;
    messengerCall.mockResolvedValue(undefined);
    jest
      .mocked(recurringOrdersApiClient.createRecurringOrder)
      .mockResolvedValue({
        order: MOCK_RECURRING_OPEN_ORDER,
      });
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      );
    const { result } = renderHook(() => useCreateRecurringOrder(), {
      wrapper,
    });

    await act(async () => {
      await result.current.createRecurringOrder(request);
    });

    expect(
      jest.mocked(recurringOrdersApiClient.createRecurringOrder).mock
        .calls[0][0],
    ).toStrictEqual(request);
    await waitFor(() => {
      expect(messengerCall).toHaveBeenCalledWith(
        'RecurringOrdersDataService:invalidateQueries',
        { queryKey: [RECURRING_ORDERS_QUERY_KEY] },
      );
      expect(messengerCall).toHaveBeenCalledWith(
        'RecurringOrdersDataService:invalidateQueries',
        { queryKey: [RECURRING_ORDERS_BY_ASSET_QUERY_KEY] },
      );
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [RECURRING_ORDERS_QUERY_KEY],
        refetchType: 'active',
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: [RECURRING_ORDERS_BY_ASSET_QUERY_KEY],
        refetchType: 'active',
      });
    });

    queryClient.clear();
  });
});
