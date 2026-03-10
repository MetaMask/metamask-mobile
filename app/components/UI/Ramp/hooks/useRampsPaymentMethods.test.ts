import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsPaymentMethods } from './useRampsPaymentMethods';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getPaymentMethods: jest.fn(),
      setSelectedPaymentMethod: jest.fn(),
    },
  },
}));

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: '/payments/debit-credit-card',
    paymentType: 'debit-credit-card',
    name: 'Debit/Credit Card',
    score: 100,
    icon: 'card',
  },
  {
    id: '/payments/bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Bank Transfer',
    score: 90,
    icon: 'bank',
  },
];

const baseRampsState = {
  userRegion: {
    country: {
      currency: 'USD',
      quickAmounts: [50, 100, 200],
    },
    state: null,
    regionCode: 'us',
  },
  providers: {
    data: [],
    selected: {
      id: '/providers/transak',
      name: 'Transak',
    },
    isLoading: false,
    error: null,
  },
  tokens: {
    data: null,
    selected: {
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
      iconUrl: '',
      tokenSupported: true,
    },
    isLoading: false,
    error: null,
  },
  paymentMethods: {
    data: [],
    selected: null,
    isLoading: false,
    error: null,
  },
};

const createMockStore = (rampsControllerOverrides = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            ...baseRampsState,
            ...rampsControllerOverrides,
          },
        },
      }),
    },
  });

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store },
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    );

  return { Wrapper, queryClient };
};

describe('useRampsPaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns idle before an active request exists', () => {
    const store = createMockStore({
      providers: { ...baseRampsState.providers, selected: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    expect(result.current).toMatchObject({
      paymentMethods: [],
      selectedPaymentMethod: null,
      isLoading: false,
      status: 'idle',
      isSuccess: false,
      error: null,
    });
    expect(
      Engine.context.RampsController.getPaymentMethods,
    ).not.toHaveBeenCalled();
  });

  it('returns loading while the active query is in flight', () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    (
      Engine.context.RampsController.getPaymentMethods as jest.Mock
    ).mockImplementation(() => new Promise(() => undefined));

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe('loading');
  });

  it('returns success with data and preserves controller-backed selection', async () => {
    const store = createMockStore({
      paymentMethods: {
        ...baseRampsState.paymentMethods,
        selected: mockPaymentMethods[0],
      },
    });
    const { Wrapper } = createWrapper(store);

    (
      Engine.context.RampsController.getPaymentMethods as jest.Mock
    ).mockResolvedValue({
      payments: mockPaymentMethods,
    });

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[0]);
    expect(result.current.isSuccess).toBe(true);
  });

  it('returns success with an empty array when the request completes empty', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    (
      Engine.context.RampsController.getPaymentMethods as jest.Mock
    ).mockResolvedValue({
      payments: [],
    });

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.paymentMethods).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns error when the request rejects', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    (
      Engine.context.RampsController.getPaymentMethods as jest.Mock
    ).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.paymentMethods).toEqual([]);
  });

  it('calls Engine.context.RampsController.setSelectedPaymentMethod with payment method id', () => {
    const store = createMockStore({
      providers: { ...baseRampsState.providers, selected: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setSelectedPaymentMethod(mockPaymentMethods[0]);
    });

    expect(
      Engine.context.RampsController.setSelectedPaymentMethod,
    ).toHaveBeenCalledWith(mockPaymentMethods[0].id);
  });

  it('calls Engine.context.RampsController.setSelectedPaymentMethod with undefined when payment method is null', () => {
    const store = createMockStore({
      providers: { ...baseRampsState.providers, selected: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setSelectedPaymentMethod(null);
    });

    expect(
      Engine.context.RampsController.setSelectedPaymentMethod,
    ).toHaveBeenCalledWith(undefined);
  });
});
