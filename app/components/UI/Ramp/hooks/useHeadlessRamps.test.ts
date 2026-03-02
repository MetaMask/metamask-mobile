import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import { useHeadlessRamps } from './useHeadlessRamps';
import { createHeadlessBuyNavDetails } from '../Views/HeadlessBuy/HeadlessBuy';
import { createRampsOrderDetailsNavDetails } from '../Views/OrderDetails/OrderDetails';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
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

const mockSetSelectedToken = jest.fn();
jest.mock('./useRampsController', () => ({
  useRampsController: jest.fn(() => ({
    setSelectedToken: mockSetSelectedToken,
    paymentMethods: [{ id: 'card', name: 'Card' }],
    paymentMethodsLoading: false,
    paymentMethodsError: null,
    tokensLoading: false,
    tokensError: null,
    providersLoading: false,
    providersError: null,
  })),
}));

jest.mock('../Views/HeadlessBuy/HeadlessBuy', () => ({
  createHeadlessBuyNavDetails: jest.fn(),
}));

jest.mock('../Views/OrderDetails/OrderDetails', () => ({
  createRampsOrderDetailsNavDetails: jest.fn(),
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockSubscribe = Engine.controllerMessenger
  .subscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.subscribe
>;
const mockUnsubscribe = Engine.controllerMessenger
  .unsubscribe as jest.MockedFunction<
  typeof Engine.controllerMessenger.unsubscribe
>;
const mockCreateHeadlessBuyNavDetails =
  createHeadlessBuyNavDetails as jest.MockedFunction<
    typeof createHeadlessBuyNavDetails
  >;
const mockCreateRampsOrderDetailsNavDetails =
  createRampsOrderDetailsNavDetails as jest.MockedFunction<
    typeof createRampsOrderDetailsNavDetails
  >;

const createMockStore = () =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {},
        },
      }),
      fiatOrders: () => ({ orders: [] }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

function createMockOrder(status: RampsOrderStatus): RampsOrder {
  return {
    providerOrderId: 'order-123',
    status,
    assetId: 'eip155:1/slip44:60',
  } as RampsOrder;
}

type OrderStatusHandler = (event: {
  order: RampsOrder;
  previousStatus: RampsOrderStatus;
}) => void;

describe('useHeadlessRamps', () => {
  let orderStatusHandler: OrderStatusHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);

    mockSubscribe.mockImplementation(
      (_event: string, handler: OrderStatusHandler) => {
        orderStatusHandler = handler;
        return undefined;
      },
    );

    mockCreateHeadlessBuyNavDetails.mockReturnValue([
      'RampTokenSelection',
      { screen: 'RampHeadlessBuy', params: {} },
    ] as never);
    mockCreateRampsOrderDetailsNavDetails.mockReturnValue([
      'RampOrderDetails',
      { orderId: 'order-123' },
    ] as never);
  });

  describe('return value structure', () => {
    it('returns paymentMethods, isLoading, error, openBuyModal, order, goToBuyOrder', () => {
      const store = createMockStore();
      const { result } = renderHook(
        () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        paymentMethods: [{ id: 'card', name: 'Card' }],
        isLoading: false,
        error: null,
        order: null,
      });
      expect(typeof result.current.openBuyModal).toBe('function');
      expect(typeof result.current.goToBuyOrder).toBe('function');
    });

    it('returns order as null initially', () => {
      const store = createMockStore();
      const { result } = renderHook(
        () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.order).toBeNull();
    });
  });

  describe('assetId and setSelectedToken', () => {
    it('calls setSelectedToken when assetId is provided', () => {
      const store = createMockStore();
      renderHook(() => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }), {
        wrapper: wrapper(store),
      });

      expect(mockSetSelectedToken).toHaveBeenCalledWith('eip155:1/slip44:60');
    });

    it('does not call setSelectedToken when assetId is omitted', () => {
      const store = createMockStore();
      renderHook(() => useHeadlessRamps(), { wrapper: wrapper(store) });

      expect(mockSetSelectedToken).not.toHaveBeenCalled();
    });
  });

  describe('openBuyModal', () => {
    it('throws when assetId is not provided to hook', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useHeadlessRamps(), {
        wrapper: wrapper(store),
      });

      expect(() =>
        result.current.openBuyModal({
          paymentMethodId: 'card',
          amount: 100,
        }),
      ).toThrow('useHeadlessRamps: assetId is required to open buy modal');
    });

    it('navigates with headless buy params when assetId is provided', () => {
      const navDetails = ['RampTokenSelection', { screen: 'RampHeadlessBuy' }];
      mockCreateHeadlessBuyNavDetails.mockReturnValue(navDetails as never);

      const store = createMockStore();
      const { result } = renderHook(
        () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
        { wrapper: wrapper(store) },
      );

      result.current.openBuyModal({
        paymentMethodId: 'card',
        amount: 100,
      });

      expect(mockCreateHeadlessBuyNavDetails).toHaveBeenCalledWith({
        assetId: 'eip155:1/slip44:60',
        paymentMethodId: 'card',
        amount: 100,
      });
      expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
    });
  });

  describe('goToBuyOrder', () => {
    it('navigates to order details with orderId', () => {
      const navDetails = ['RampOrderDetails', { orderId: 'order-123' }];
      mockCreateRampsOrderDetailsNavDetails.mockReturnValue(
        navDetails as never,
      );

      const store = createMockStore();
      const { result } = renderHook(
        () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
        { wrapper: wrapper(store) },
      );

      result.current.goToBuyOrder('order-123');

      expect(mockCreateRampsOrderDetailsNavDetails).toHaveBeenCalledWith({
        orderId: 'order-123',
      });
      expect(mockNavigate).toHaveBeenCalledWith(...navDetails);
    });
  });

  describe('orderStatusChanged subscription', () => {
    it('subscribes to RampsController:orderStatusChanged on mount', () => {
      const store = createMockStore();
      renderHook(() => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }), {
        wrapper: wrapper(store),
      });

      expect(mockSubscribe).toHaveBeenCalledWith(
        'RampsController:orderStatusChanged',
        expect.any(Function),
      );
    });

    it('updates order when orderStatusChanged fires', async () => {
      const order = createMockOrder(RampsOrderStatus.Completed);
      const store = createMockStore();
      const { result } = renderHook(
        () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.order).toBeNull();

      await act(() => {
        orderStatusHandler({
          order,
          previousStatus: RampsOrderStatus.Pending,
        });
      });

      await waitFor(() => {
        expect(result.current.order).toEqual(order);
      });
    });

    it('unsubscribes on unmount', () => {
      const store = createMockStore();
      const { unmount } = renderHook(
        () => useHeadlessRamps({ assetId: 'eip155:1/slip44:60' }),
        { wrapper: wrapper(store) },
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledWith(
        'RampsController:orderStatusChanged',
        expect.any(Function),
      );
    });
  });

  describe('onOrderSucceeded', () => {
    it('calls onOrderSucceeded when order status becomes Completed', async () => {
      const onOrderSucceeded = jest.fn();
      const order = createMockOrder(RampsOrderStatus.Completed);

      const store = createMockStore();
      renderHook(
        () =>
          useHeadlessRamps({
            assetId: 'eip155:1/slip44:60',
            onOrderSucceeded,
          }),
        { wrapper: wrapper(store) },
      );

      await act(() => {
        orderStatusHandler({
          order,
          previousStatus: RampsOrderStatus.Pending,
        });
      });

      expect(onOrderSucceeded).toHaveBeenCalledWith(order);
    });

    it('does not call onOrderSucceeded when status is not Completed', async () => {
      const onOrderSucceeded = jest.fn();
      const order = createMockOrder(RampsOrderStatus.Failed);

      const store = createMockStore();
      renderHook(
        () =>
          useHeadlessRamps({
            assetId: 'eip155:1/slip44:60',
            onOrderSucceeded,
          }),
        { wrapper: wrapper(store) },
      );

      await act(() => {
        orderStatusHandler({
          order,
          previousStatus: RampsOrderStatus.Pending,
        });
      });

      expect(onOrderSucceeded).not.toHaveBeenCalled();
    });
  });

  describe('onOrderFailed', () => {
    it('calls onOrderFailed when order status becomes Failed', async () => {
      const onOrderFailed = jest.fn();
      const order = createMockOrder(RampsOrderStatus.Failed);

      const store = createMockStore();
      renderHook(
        () =>
          useHeadlessRamps({
            assetId: 'eip155:1/slip44:60',
            onOrderFailed,
          }),
        { wrapper: wrapper(store) },
      );

      await act(() => {
        orderStatusHandler({
          order,
          previousStatus: RampsOrderStatus.Pending,
        });
      });

      expect(onOrderFailed).toHaveBeenCalledWith(order);
    });

    it('calls onOrderFailed when order status becomes Cancelled', async () => {
      const onOrderFailed = jest.fn();
      const order = createMockOrder(RampsOrderStatus.Cancelled);

      const store = createMockStore();
      renderHook(
        () =>
          useHeadlessRamps({
            assetId: 'eip155:1/slip44:60',
            onOrderFailed,
          }),
        { wrapper: wrapper(store) },
      );

      await act(() => {
        orderStatusHandler({
          order,
          previousStatus: RampsOrderStatus.Pending,
        });
      });

      expect(onOrderFailed).toHaveBeenCalledWith(order);
    });

    it('calls onOrderFailed when order status becomes IdExpired', async () => {
      const onOrderFailed = jest.fn();
      const order = createMockOrder(RampsOrderStatus.IdExpired);

      const store = createMockStore();
      renderHook(
        () =>
          useHeadlessRamps({
            assetId: 'eip155:1/slip44:60',
            onOrderFailed,
          }),
        { wrapper: wrapper(store) },
      );

      await act(() => {
        orderStatusHandler({
          order,
          previousStatus: RampsOrderStatus.Pending,
        });
      });

      expect(onOrderFailed).toHaveBeenCalledWith(order);
    });

    it('does not call onOrderFailed when status is Completed', async () => {
      const onOrderFailed = jest.fn();
      const order = createMockOrder(RampsOrderStatus.Completed);

      const store = createMockStore();
      renderHook(
        () =>
          useHeadlessRamps({
            assetId: 'eip155:1/slip44:60',
            onOrderFailed,
          }),
        { wrapper: wrapper(store) },
      );

      await act(() => {
        orderStatusHandler({
          order,
          previousStatus: RampsOrderStatus.Pending,
        });
      });

      expect(onOrderFailed).not.toHaveBeenCalled();
    });
  });
});
