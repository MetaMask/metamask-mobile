import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useHeadlessRamps } from './useHeadlessRamps';
import { useRampsController } from './useRampsController';
import {
  resetHeadlessBuySession,
  trackHeadlessBuyOrder,
} from '../utils/headlessBuySessionRegistry';

const mockNavigate = jest.fn();
const mockSetSelectedToken = jest.fn();
const mockGetQuotes = jest.fn();

let sessionIdFromNav: string | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    },
  },
}));

jest.mock('./useRampsController', () => ({
  useRampsController: jest.fn(),
}));

jest.mock('./useRampAccountAddress', () => ({
  __esModule: true,
  default: () => '0x1234567890abcdef',
}));

jest.mock('../Views/BuildQuote', () => ({
  createBuildQuoteNavDetails: jest.fn((params: unknown) => {
    sessionIdFromNav = (params as { headlessBuy?: { sessionId?: string } })
      .headlessBuy?.sessionId;
    return [
      'RampTokenSelection',
      { screen: 'RampAmountInput', params },
    ] as const;
  }),
}));

jest.mock('../Views/OrderDetails/OrderDetails', () => ({
  createRampsOrderDetailsNavDetails: jest.fn(
    ({ orderId }: { orderId: string }) => ['RampOrderDetails', { orderId }],
  ),
}));

const mockSubscribe = Engine.controllerMessenger
  .subscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.subscribe
>;
const mockUnsubscribe = Engine.controllerMessenger
  .unsubscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.unsubscribe
>;

const createMockStore = () =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {},
        },
      }),
    },
  });

const createWrapper = () => {
  const store = createMockStore();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store } as never,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    );
};

function createMockOrder(
  providerOrderId: string,
  status: RampsOrderStatus,
): RampsOrder {
  return {
    id: providerOrderId,
    providerOrderId,
    status,
    provider: { id: '/providers/moonpay', name: 'MoonPay' },
  } as RampsOrder;
}

describe('useHeadlessRamps', () => {
  let orderStatusHandler: (event: {
    order: RampsOrder;
    previousStatus: RampsOrderStatus;
  }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionIdFromNav = undefined;

    (
      useNavigation as jest.MockedFunction<typeof useNavigation>
    ).mockReturnValue({
      navigate: mockNavigate,
    } as never);

    (
      useRampsController as jest.MockedFunction<typeof useRampsController>
    ).mockReturnValue({
      setSelectedToken: mockSetSelectedToken,
      selectedProvider: {
        id: '/providers/moonpay',
        name: 'MoonPay',
      },
      selectedToken: {
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        symbol: 'ETH',
      },
      getQuotes: mockGetQuotes,
      paymentMethods: [{ id: '/payments/card', name: 'Card' }],
      paymentMethodsLoading: false,
      paymentMethodsError: null,
      tokensLoading: false,
      tokensError: null,
      providersLoading: false,
      providersError: null,
    } as ReturnType<typeof useRampsController>);

    mockSubscribe.mockImplementation(
      (
        _event,
        handler: (event: {
          order: RampsOrder;
          previousStatus: RampsOrderStatus;
        }) => void,
      ) => {
        orderStatusHandler = handler;
      },
    );
  });

  it('navigates to BuildQuote with headless bootstrap params', () => {
    const { result } = renderHook(
      () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.openBuyModal({
        paymentMethodId: '/payments/card',
        amount: 100,
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'RampTokenSelection',
      expect.objectContaining({
        screen: 'RampAmountInput',
        params: expect.objectContaining({
          assetId: 'eip155:1/slip44:60',
          amount: 100,
          headlessBuy: expect.objectContaining({
            paymentMethodId: '/payments/card',
          }),
        }),
      }),
    );
    expect(sessionIdFromNav).toBeTruthy();
  });

  it('ignores unrelated order updates', async () => {
    const onOrderSucceeded = jest.fn();
    const { result } = renderHook(
      () =>
        useHeadlessRamps({
          assetId: 'eip155:1/slip44:60',
          onOrderSucceeded,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.openBuyModal({
        paymentMethodId: '/payments/card',
        amount: 100,
      });
    });

    await act(async () => {
      orderStatusHandler({
        order: createMockOrder('unrelated-order', RampsOrderStatus.Completed),
        previousStatus: RampsOrderStatus.Pending,
      });
    });

    expect(result.current.order).toBeNull();
    expect(onOrderSucceeded).not.toHaveBeenCalled();
  });

  it('updates order and fires callbacks for tracked orders only', async () => {
    const onOrderFailed = jest.fn();
    const { result } = renderHook(
      () =>
        useHeadlessRamps({
          assetId: 'eip155:1/slip44:60',
          onOrderFailed,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.openBuyModal({
        paymentMethodId: '/payments/card',
        amount: 100,
      });
    });

    expect(sessionIdFromNav).toBeTruthy();
    resetHeadlessBuySession(sessionIdFromNav as string);
    trackHeadlessBuyOrder(sessionIdFromNav, 'tracked-order');

    const trackedOrder = createMockOrder(
      'tracked-order',
      RampsOrderStatus.Failed,
    );

    await act(async () => {
      orderStatusHandler({
        order: trackedOrder,
        previousStatus: RampsOrderStatus.Pending,
      });
    });

    await waitFor(() => {
      expect(result.current.order).toEqual(trackedOrder);
    });
    expect(onOrderFailed).toHaveBeenCalledWith(trackedOrder);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(
      () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
      { wrapper: createWrapper() },
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'RampsController:orderStatusChanged',
      expect.any(Function),
    );
  });
});
