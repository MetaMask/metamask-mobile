import React, { type PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getLimitOrder } from '../api/limitOrders/getLimitOrder';
import type { GetLimitOrderResponse } from '../api/limitOrders/getLimitOrder/schema';
import { useLimitOrder } from './useLimitOrder';

jest.mock('../api/limitOrders/getLimitOrder', () => ({
  getLimitOrder: jest.fn(),
}));

const mockGetLimitOrder = jest.mocked(getLimitOrder);
const PARAMS = {
  orderId: 'order-1',
  accountAddress: 'eip155:1:0x1234567890123456789012345678901234567890',
};

function createWrapper() {
  // Mirrors the app query client, whose default would otherwise keep the
  // order fresh for several minutes.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
  });
  const wrapper = ({ children }: PropsWithChildren) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { queryClient, wrapper };
}

describe('useLimitOrder', () => {
  beforeEach(() => {
    // Freshness is measured against the clock, which the test setup stubs and
    // `resetAllMocks` leaves returning nothing.
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('fetches the order for the given id and account', async () => {
    const response = { id: 'order-1' } as unknown as GetLimitOrderResponse;
    mockGetLimitOrder.mockResolvedValue(response);
    const { queryClient, wrapper } = createWrapper();

    const { result } = renderHook(() => useLimitOrder(PARAMS), { wrapper });

    await waitFor(() => expect(result.current.data).toBe(response));
    expect(mockGetLimitOrder).toHaveBeenCalledWith(PARAMS);
    queryClient.clear();
  });

  it('fetches the order from the API again every time it is shown', async () => {
    mockGetLimitOrder.mockResolvedValue({} as unknown as GetLimitOrderResponse);
    const { queryClient, wrapper } = createWrapper();

    const first = renderHook(() => useLimitOrder(PARAMS), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderHook(() => useLimitOrder(PARAMS), { wrapper });

    await waitFor(() => expect(mockGetLimitOrder).toHaveBeenCalledTimes(2));
    second.unmount();
    queryClient.clear();
  });
});
