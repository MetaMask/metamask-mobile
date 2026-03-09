import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import { useRampsOrders } from './useRampsOrders';

const mockAddOrder = jest.fn();
const mockRemoveOrder = jest.fn();
const mockGetOrder = jest.fn();
const mockGetOrderFromCallback = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      addOrder: (...args: unknown[]) => mockAddOrder(...args),
      removeOrder: (...args: unknown[]) => mockRemoveOrder(...args),
      getOrder: (...args: unknown[]) => mockGetOrder(...args),
      getOrderFromCallback: (...args: unknown[]) =>
        mockGetOrderFromCallback(...args),
    },
  },
}));

const createMockOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '0.5',
  fiatAmount: 100,
  providerOrderId: 'order-1',
  providerOrderLink: 'https://example.com/order/1',
  createdAt: Date.now(),
  totalFeesFiat: 5,
  txHash: '0xabc',
  walletAddress: '0x123',
  status: RampsOrderStatus.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  ...overrides,
});

const createMockStore = (orders: RampsOrder[] = []) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            orders,
          },
        },
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty orders when none exist', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.orders).toEqual([]);
  });

  it('returns orders from the store', () => {
    const order = createMockOrder();
    const store = createMockStore([order]);
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.orders).toEqual([order]);
  });

  it('finds an order by providerOrderId', () => {
    const order1 = createMockOrder({ providerOrderId: 'order-1' });
    const order2 = createMockOrder({ providerOrderId: 'order-2' });
    const store = createMockStore([order1, order2]);
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.getOrderById('order-2')).toEqual(order2);
  });

  it('returns undefined for non-existent order id', () => {
    const store = createMockStore([createMockOrder()]);
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(result.current.getOrderById('non-existent')).toBeUndefined();
  });

  it('calls Engine.context.RampsController.addOrder', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });
    const order = createMockOrder();

    act(() => {
      result.current.addOrder(order);
    });

    expect(mockAddOrder).toHaveBeenCalledWith(order);
  });

  it('calls Engine.context.RampsController.removeOrder', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    act(() => {
      result.current.removeOrder('order-1');
    });

    expect(mockRemoveOrder).toHaveBeenCalledWith('order-1');
  });

  it('calls Engine.context.RampsController.getOrder for refreshOrder', async () => {
    const refreshedOrder = createMockOrder({
      status: RampsOrderStatus.Completed,
    });
    mockGetOrder.mockResolvedValue(refreshedOrder);

    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    let returnedOrder: RampsOrder | undefined;
    await act(async () => {
      returnedOrder = await result.current.refreshOrder(
        'transak',
        'order-code',
        '0x123',
      );
    });

    expect(mockGetOrder).toHaveBeenCalledWith('transak', 'order-code', '0x123');
    expect(returnedOrder).toEqual(refreshedOrder);
  });

  it('calls Engine.context.RampsController.getOrderFromCallback', async () => {
    const callbackOrder = createMockOrder({ providerOrderId: 'callback-1' });
    mockGetOrderFromCallback.mockResolvedValue(callbackOrder);

    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    let returnedOrder: RampsOrder | undefined;
    await act(async () => {
      returnedOrder = await result.current.getOrderFromCallback(
        'transak',
        'https://callback.url',
        '0x123',
      );
    });

    expect(mockGetOrderFromCallback).toHaveBeenCalledWith(
      'transak',
      'https://callback.url',
      '0x123',
    );
    expect(returnedOrder).toEqual(callbackOrder);
  });

  it('exposes all expected functions', () => {
    const store = createMockStore();
    const { result } = renderHook(() => useRampsOrders(), {
      wrapper: wrapper(store),
    });

    expect(typeof result.current.getOrderById).toBe('function');
    expect(typeof result.current.addOrder).toBe('function');
    expect(typeof result.current.removeOrder).toBe('function');
    expect(typeof result.current.refreshOrder).toBe('function');
    expect(typeof result.current.getOrderFromCallback).toBe('function');
  });
});
