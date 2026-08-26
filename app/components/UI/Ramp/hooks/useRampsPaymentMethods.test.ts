import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { useRampsPaymentMethods } from './useRampsPaymentMethods';
import Engine from '../../../../core/Engine';
import { rampsPaymentMethodsOptions } from '../queries/paymentMethods';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});
notifyManager.setNotifyFunction((callback) => {
  act(callback);
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  locale: 'en',
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getPaymentMethodsForContext: jest.fn(),
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

const staleMethod: PaymentMethod = {
  id: '/payments/stale',
  paymentType: 'stale',
  name: 'Stale',
  score: 0,
  icon: 'stale',
};

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
    data: [] as PaymentMethod[],
    selected: null as PaymentMethod | null,
    isLoading: false,
    error: null,
  },
};

type RampsState = typeof baseRampsState;
type RampsOverrides = Partial<RampsState>;

const createMockStore = (rampsControllerOverrides: RampsOverrides = {}) => {
  const initialRampsState = {
    ...baseRampsState,
    ...rampsControllerOverrides,
  };
  const initialState = {
    engine: {
      backgroundState: {
        RampsController: initialRampsState,
      },
    },
  };

  return configureStore({
    reducer: (
      state: typeof initialState | undefined,
      action: { type: string; payload?: RampsOverrides },
    ) => {
      const currentState = state ?? initialState;
      if (action.type !== 'test/updateRamps' || !action.payload) {
        return currentState;
      }
      return {
        engine: {
          backgroundState: {
            RampsController: {
              ...currentState.engine.backgroundState.RampsController,
              ...action.payload,
            },
          },
        },
      };
    },
  });
};

const updateRampsState = (
  store: ReturnType<typeof createMockStore>,
  payload: RampsOverrides,
) => {
  store.dispatch({ type: 'test/updateRamps', payload });
};

const queryClients: QueryClient[] = [];

const createWrapper = (store: ReturnType<typeof createMockStore>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: Infinity,
      },
    },
  });
  queryClients.push(queryClient);
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store } as never,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    );

  return { Wrapper, queryClient };
};

const contextResponse = (
  methods = mockPaymentMethods,
  selected: PaymentMethod | null = methods[0] ?? null,
) => ({
  methods,
  selected,
  providerIds: ['/providers/transak'],
});

const createDeferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const getPaymentMethodsForContextMock = jest.mocked(
  Engine.context.RampsController.getPaymentMethodsForContext,
);
const setSelectedPaymentMethodMock = jest.mocked(
  Engine.context.RampsController.setSelectedPaymentMethod,
);

describe('useRampsPaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      for (const queryClient of queryClients.splice(0)) {
        await queryClient.cancelQueries();
        queryClient.clear();
      }
    });
  });

  it.each([
    [
      'region',
      {
        userRegion: { ...baseRampsState.userRegion, regionCode: '' },
      },
    ],
    [
      'asset',
      {
        tokens: { ...baseRampsState.tokens, selected: null },
      },
    ],
    [
      'provider',
      {
        providers: { ...baseRampsState.providers, selected: null },
      },
    ],
  ])('is idle when %s is missing', (_label, overrides) => {
    const store = createMockStore(overrides as RampsOverrides);
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
    });
    expect(getPaymentMethodsForContextMock).not.toHaveBeenCalled();
  });

  it('passes normalized region, EVM asset, and provider context', async () => {
    const checksummedAssetId =
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const store = createMockStore({
      userRegion: { ...baseRampsState.userRegion, regionCode: ' US ' },
      tokens: {
        ...baseRampsState.tokens,
        selected: {
          ...baseRampsState.tokens.selected,
          assetId: ` ${checksummedAssetId} `,
        },
      },
      providers: {
        ...baseRampsState.providers,
        selected: {
          ...baseRampsState.providers.selected,
          id: ' /providers/transak ',
        },
      },
    });
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    renderHook(() => useRampsPaymentMethods(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith({
        region: 'us',
        assetId: checksummedAssetId.toLowerCase(),
        providers: ['/providers/transak'],
        updateState: true,
      }),
    );
  });

  it('preserves non-EVM asset case', async () => {
    const assetId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
    const store = createMockStore({
      tokens: {
        ...baseRampsState.tokens,
        selected: { ...baseRampsState.tokens.selected, assetId },
      },
    });
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    renderHook(() => useRampsPaymentMethods(), { wrapper: Wrapper });

    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ assetId }),
      ),
    );
  });

  it('refetches when token changes', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());
    renderHook(() => useRampsPaymentMethods(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      updateRampsState(store, {
        tokens: {
          ...baseRampsState.tokens,
          selected: {
            ...baseRampsState.tokens.selected,
            assetId: 'eip155:1/erc20:0x1234',
          },
        },
      });
    });

    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(2),
    );
  });

  it('refetches when provider changes', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());
    renderHook(() => useRampsPaymentMethods(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      updateRampsState(store, {
        providers: {
          ...baseRampsState.providers,
          selected: { id: '/providers/moonpay', name: 'MoonPay' },
        },
      });
    });

    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(2),
    );
  });

  it('rehydrates controller state when returning to a cached context', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());
    renderHook(() => useRampsPaymentMethods(), { wrapper: Wrapper });
    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      updateRampsState(store, {
        providers: {
          ...baseRampsState.providers,
          selected: { id: '/providers/moonpay', name: 'MoonPay' },
        },
      });
    });
    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      updateRampsState(store, { providers: baseRampsState.providers });
    });

    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(3),
    );
  });

  it('keeps cached active-context methods visible during a background refetch', async () => {
    const store = createMockStore();
    const { Wrapper, queryClient } = createWrapper(store);
    const cachedResponse = contextResponse();
    queryClient.setQueryData(
      rampsPaymentMethodsOptions({
        regionCode: 'us',
        assetId: 'eip155:1/slip44:60',
        providerId: '/providers/transak',
      }).queryKey,
      cachedResponse,
    );
    const deferred = createDeferred<ReturnType<typeof contextResponse>>();
    getPaymentMethodsForContextMock.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[0]);
    expect(result.current.status).toBe('success');
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      deferred.resolve(cachedResponse);
      await deferred.promise;
    });
    await waitFor(() => expect(result.current.isFetching).toBe(false));
  });

  it('does not show context A methods while uncached context B loads', async () => {
    const store = createMockStore({
      paymentMethods: {
        ...baseRampsState.paymentMethods,
        data: mockPaymentMethods,
        selected: mockPaymentMethods[0],
      },
    });
    const { Wrapper } = createWrapper(store);
    const contextBMethod: PaymentMethod = {
      ...staleMethod,
      id: '/payments/context-b',
      name: 'Context B',
    };
    const contextBResponse = contextResponse([contextBMethod], contextBMethod);
    const contextBDeferred =
      createDeferred<ReturnType<typeof contextResponse>>();
    getPaymentMethodsForContextMock.mockImplementation(
      async ({ providers }) => {
        if (providers?.[0] === '/providers/moonpay') {
          return contextBDeferred.promise;
        }
        return contextResponse();
      },
    );

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.status).toBe('success'));

    await act(async () => {
      updateRampsState(store, {
        providers: {
          ...baseRampsState.providers,
          selected: { id: '/providers/moonpay', name: 'MoonPay' },
        },
      });
    });

    expect(result.current.paymentMethods).toEqual([]);
    expect(result.current.selectedPaymentMethod).toBeNull();
    expect(result.current.status).toBe('loading');

    await act(async () => {
      contextBDeferred.resolve(contextBResponse);
      await contextBDeferred.promise;
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.paymentMethods).toEqual([contextBMethod]);
  });

  it('reuses and settles the original A request across A-B-A', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    const contextADeferred =
      createDeferred<ReturnType<typeof contextResponse>>();
    const contextBDeferred =
      createDeferred<ReturnType<typeof contextResponse>>();
    getPaymentMethodsForContextMock.mockImplementation(async ({ providers }) =>
      providers?.[0] === '/providers/transak'
        ? contextADeferred.promise
        : contextBDeferred.promise,
    );

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(1),
    );
    await act(async () => {
      updateRampsState(store, {
        providers: {
          ...baseRampsState.providers,
          selected: { id: '/providers/moonpay', name: 'MoonPay' },
        },
      });
    });
    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(2),
    );
    await act(async () => {
      updateRampsState(store, { providers: baseRampsState.providers });
    });

    expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      contextBDeferred.resolve(contextResponse([staleMethod], staleMethod));
      await contextBDeferred.promise;
      contextADeferred.resolve(contextResponse());
      await contextADeferred.promise;
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
  });

  it('finishes loading after the controller commits catalog and selection', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    const deferred = createDeferred<ReturnType<typeof contextResponse>>();
    getPaymentMethodsForContextMock.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      updateRampsState(store, {
        paymentMethods: {
          ...baseRampsState.paymentMethods,
          data: mockPaymentMethods,
          selected: mockPaymentMethods[0],
        },
      });
      deferred.resolve(contextResponse());
      await deferred.promise;
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[0]);
  });

  it('preserves a valid controller selection without manual auto-selection', async () => {
    const store = createMockStore({
      paymentMethods: {
        ...baseRampsState.paymentMethods,
        data: mockPaymentMethods,
        selected: mockPaymentMethods[1],
      },
    });
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(
      contextResponse(mockPaymentMethods, mockPaymentMethods[1]),
    );

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[1]);
    expect(setSelectedPaymentMethodMock).not.toHaveBeenCalled();
  });

  it('uses the controller-selected fallback for a stale selection', async () => {
    const store = createMockStore({
      paymentMethods: {
        ...baseRampsState.paymentMethods,
        data: [staleMethod],
        selected: staleMethod,
      },
    });
    const { Wrapper } = createWrapper(store);
    const deferred = createDeferred<ReturnType<typeof contextResponse>>();
    getPaymentMethodsForContextMock.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      updateRampsState(store, {
        paymentMethods: {
          ...baseRampsState.paymentMethods,
          data: mockPaymentMethods,
          selected: mockPaymentMethods[0],
        },
      });
      deferred.resolve(contextResponse());
      await deferred.promise;
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[0]);
    expect(setSelectedPaymentMethodMock).not.toHaveBeenCalled();
  });

  it('returns empty success without automatic selection', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(
      contextResponse([], null),
    );

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.paymentMethods).toEqual([]);
    expect(result.current.selectedPaymentMethod).toBeNull();
    expect(setSelectedPaymentMethodMock).not.toHaveBeenCalled();
  });

  it('preserves localized circuit-breaker errors', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockRejectedValue(
      Object.assign(
        new Error('Execution prevented because the circuit breaker is open'),
        { errorKey: 'CIRCUIT_BREAKER_OPEN' },
      ),
    );

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('fiat_on_ramp.circuit_breaker_open');
  });

  it('preserves ordinary request errors', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Network error');
  });

  it('keeps the manual setter unchanged', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    const deferred = createDeferred<ReturnType<typeof contextResponse>>();
    getPaymentMethodsForContextMock.mockReturnValue(deferred.promise);
    const { result } = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await act(async () =>
      result.current.setSelectedPaymentMethod(mockPaymentMethods[0]),
    );

    expect(setSelectedPaymentMethodMock).toHaveBeenCalledWith(
      mockPaymentMethods[0],
    );

    await act(async () => {
      deferred.resolve(contextResponse());
      await deferred.promise;
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
  });

  it('deduplicates same-key concurrent consumers safely', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    const first = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });
    const second = renderHook(() => useRampsPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(first.result.current.status).toBe('success'));
    await waitFor(() => expect(second.result.current.status).toBe('success'));
    expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(1);
  });
});
