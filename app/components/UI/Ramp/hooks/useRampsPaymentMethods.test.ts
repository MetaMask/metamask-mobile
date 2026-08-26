import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { useRampsPaymentMethods } from './useRampsPaymentMethods';
import { type PaymentMethod } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { rampsPaymentMethodsOptions } from '../queries/paymentMethods';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});
notifyManager.setNotifyFunction(act);

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
    TransactionPayController: { updateFiatPayment: jest.fn() },
  },
}));

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('../../../Views/confirmations/hooks/pay/useMMPayFiatConfig');
jest.mock('../../../Views/confirmations/hooks/pay/useTransactionPayData');
jest.mock('../../../../selectors/featureFlagController/deposit', () => ({
  selectFiatDepositAssetOverride: () => undefined,
}));

/** The Buy catalog binding, pinned the way every Buy surface pins itself. */
const useBuyPaymentMethods = () => useRampsPaymentMethods({ catalog: 'buy' });

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
// Every slice member is nullable in real controller state, so overrides must be
// able to clear `selected` even though `baseRampsState` seeds it with a value.
type RampsOverrides = {
  [K in keyof RampsState]?: {
    [P in keyof RampsState[K]]: RampsState[K][P] | null;
  };
};

// Dispatchable so tests can move the active context (token / provider /
// controller catalog) after mount, the way RampsController does at runtime.
const createMockStore = (rampsControllerOverrides: RampsOverrides = {}) => {
  const initialState = {
    engine: {
      backgroundState: {
        RampsController: { ...baseRampsState, ...rampsControllerOverrides },
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

type ContextResponse = ReturnType<typeof contextResponse>;

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
const updateFiatPaymentMock = jest.mocked(
  Engine.context.TransactionPayController.updateFiatPayment,
);
const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
const useTransactionPayFiatPaymentMock = jest.mocked(
  useTransactionPayFiatPayment,
);

const FIAT_ENABLED_TYPES = [
  TransactionType.moneyAccountDeposit,
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

describe('useRampsPaymentMethods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // No pending fiat deposit by default, so the Buy tests below are unaffected
    // by the active-fiat-context branch.
    useTransactionMetadataRequestMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof useTransactionMetadataRequest>,
    );
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: FIAT_ENABLED_TYPES,
      maxDelayMinutesForPaymentMethods: 10,
    });
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      for (const queryClient of queryClients.splice(0)) {
        await queryClient.cancelQueries();
        queryClient.clear();
      }
    });
  });

  it('returns idle when no provider is selected', () => {
    const store = createMockStore({
      providers: { ...baseRampsState.providers, selected: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useBuyPaymentMethods(), {
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
      Engine.context.RampsController.getPaymentMethodsForContext,
    ).not.toHaveBeenCalled();
  });

  it('returns loading while the query is in flight', () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    (
      Engine.context.RampsController.getPaymentMethodsForContext as jest.Mock
    ).mockImplementation(() => new Promise(() => undefined));

    const { result } = renderHook(() => useBuyPaymentMethods(), {
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

    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[0]);
    expect(result.current.isSuccess).toBe(true);
    expect(setSelectedPaymentMethodMock).not.toHaveBeenCalled();
  });

  it('returns success with an empty array when the request completes empty', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    getPaymentMethodsForContextMock.mockResolvedValue(
      contextResponse([], null),
    );

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.paymentMethods).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.selectedPaymentMethod).toBeNull();
    expect(setSelectedPaymentMethodMock).not.toHaveBeenCalled();
  });

  it('returns error when the request rejects', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    getPaymentMethodsForContextMock.mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.paymentMethods).toEqual([]);
  });

  it('returns localized fallback when the payment methods query trips the circuit breaker', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    getPaymentMethodsForContextMock.mockRejectedValue(
      Object.assign(
        new Error('Execution prevented because the circuit breaker is open'),
        { errorKey: 'CIRCUIT_BREAKER_OPEN' },
      ),
    );

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBe('fiat_on_ramp.circuit_breaker_open');
  });

  it('calls Engine.context.RampsController.setSelectedPaymentMethod with full payment method object', () => {
    const store = createMockStore({
      providers: { ...baseRampsState.providers, selected: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setSelectedPaymentMethod(mockPaymentMethods[0]);
    });

    expect(
      Engine.context.RampsController.setSelectedPaymentMethod,
    ).toHaveBeenCalledWith(mockPaymentMethods[0]);
  });

  it('calls Engine.context.RampsController.setSelectedPaymentMethod with null when payment method is null', () => {
    const store = createMockStore({
      providers: { ...baseRampsState.providers, selected: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setSelectedPaymentMethod(null);
    });

    expect(
      Engine.context.RampsController.setSelectedPaymentMethod,
    ).toHaveBeenCalledWith(null);
  });

  it('normalizes EVM checksummed assetId case before requesting the context', async () => {
    const checksummedAssetId =
      'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const store = createMockStore({
      tokens: {
        ...baseRampsState.tokens,
        selected: {
          assetId: checksummedAssetId,
          chainId: 'eip155:1',
          name: 'USDC',
          symbol: 'USDC',
          decimals: 6,
          iconUrl: '',
          tokenSupported: true,
        },
      },
    });
    const { Wrapper } = createWrapper(store);

    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    // Buy owns the shared catalog, so it requests one explicit provider and
    // lets the controller commit the result (`updateState: true`).
    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith({
        region: 'us',
        assetId: checksummedAssetId.toLowerCase(),
        providers: ['/providers/transak'],
        updateState: true,
      }),
    );
  });

  it('preserves non-EVM (Solana) assetId case when requesting the context', async () => {
    const solanaAssetId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';
    const store = createMockStore({
      tokens: {
        ...baseRampsState.tokens,
        selected: {
          assetId: solanaAssetId,
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          name: 'dogwifhat',
          symbol: 'WIF',
          decimals: 6,
          iconUrl: '',
          tokenSupported: true,
        },
      },
    });
    const { Wrapper } = createWrapper(store);

    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith(
        expect.objectContaining({ assetId: solanaAssetId }),
      ),
    );
  });

  it('refetches when token changes', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());
    renderHook(() => useBuyPaymentMethods(), { wrapper: Wrapper });
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
    renderHook(() => useBuyPaymentMethods(), { wrapper: Wrapper });
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
    renderHook(() => useBuyPaymentMethods(), { wrapper: Wrapper });
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

    // staleTime 0 means the cached context refetches so the controller
    // re-commits the catalog it owns instead of serving a silent cache hit.
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
        updateState: true,
      }).queryKey,
      cachedResponse,
    );
    const deferred = createDeferred<ContextResponse>();
    getPaymentMethodsForContextMock.mockReturnValue(deferred.promise);

    const { result } = renderHook(() => useBuyPaymentMethods(), {
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
    const contextBDeferred = createDeferred<ContextResponse>();
    getPaymentMethodsForContextMock.mockImplementation(
      async ({ providers }) => {
        if (providers?.[0] === '/providers/moonpay') {
          return contextBDeferred.promise;
        }
        return contextResponse();
      },
    );

    const { result } = renderHook(() => useBuyPaymentMethods(), {
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

    // Replaces the old manual stale-selection guard: nothing from context A
    // may flash while context B is still loading.
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
    const contextADeferred = createDeferred<ContextResponse>();
    const contextBDeferred = createDeferred<ContextResponse>();
    getPaymentMethodsForContextMock.mockImplementation(async ({ providers }) =>
      providers?.[0] === '/providers/transak'
        ? contextADeferred.promise
        : contextBDeferred.promise,
    );

    const { result } = renderHook(() => useBuyPaymentMethods(), {
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

  it('deduplicates same-key concurrent consumers safely', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);
    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    const first = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });
    const second = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(first.result.current.status).toBe('success'));
    await waitFor(() => expect(second.result.current.status).toBe('success'));
    expect(getPaymentMethodsForContextMock).toHaveBeenCalledTimes(1);
  });

  it('finishes loading after the controller commits catalog and selection', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    let resolveQuery: (value: ContextResponse) => void = () => {
      // noop, overwritten by mock
    };
    (
      Engine.context.RampsController.getPaymentMethodsForContext as jest.Mock
    ).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
    );

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBe('loading');
    expect(result.current.isSuccess).toBe(false);

    await act(async () => {
      updateRampsState(store, {
        paymentMethods: {
          ...baseRampsState.paymentMethods,
          data: mockPaymentMethods,
          selected: mockPaymentMethods[0],
        },
      });
      resolveQuery(contextResponse());
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    // The controller commits catalog and selection together, so the hook
    // settles instead of holding `isLoading` for a manual auto-selection pass.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[0]);
  });

  it('returns selectedPaymentMethod from Redux state', async () => {
    const store = createMockStore({
      paymentMethods: {
        ...baseRampsState.paymentMethods,
        selected: mockPaymentMethods[1],
      },
    });
    const { Wrapper } = createWrapper(store);

    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(result.current.selectedPaymentMethod).toEqual(mockPaymentMethods[1]);
  });

  it('setSelectedPaymentMethod is stable across re-renders', async () => {
    const store = createMockStore();
    const { Wrapper } = createWrapper(store);

    getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

    const { result, rerender } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    const firstRef = result.current.setSelectedPaymentMethod;

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    rerender({});

    expect(result.current.setSelectedPaymentMethod).toBe(firstRef);
  });

  it('disables query when userRegion is missing', () => {
    const store = createMockStore({
      userRegion: { country: null, state: null, regionCode: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(
      Engine.context.RampsController.getPaymentMethodsForContext,
    ).not.toHaveBeenCalled();
  });

  it('disables query when no asset is selected', () => {
    const store = createMockStore({
      tokens: { ...baseRampsState.tokens, selected: null },
    });
    const { Wrapper } = createWrapper(store);

    const { result } = renderHook(() => useBuyPaymentMethods(), {
      wrapper: Wrapper,
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isLoading).toBe(false);
    expect(getPaymentMethodsForContextMock).not.toHaveBeenCalled();
  });

  describe('controller-owned selection', () => {
    it('uses the controller suggestion when Redux has no selection', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderHook(() => useBuyPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(
        Engine.context.RampsController.setSelectedPaymentMethod,
      ).not.toHaveBeenCalled();
      expect(result.current.selectedPaymentMethod).toEqual(
        mockPaymentMethods[0],
      );
    });

    it('preserves existing selection if it is still in the new list', async () => {
      const store = createMockStore({
        paymentMethods: {
          ...baseRampsState.paymentMethods,
          selected: mockPaymentMethods[1],
        },
      });
      const { Wrapper } = createWrapper(store);

      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderHook(() => useBuyPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(
        Engine.context.RampsController.setSelectedPaymentMethod,
      ).not.toHaveBeenCalled();
      expect(result.current.selectedPaymentMethod).toEqual(
        mockPaymentMethods[1],
      );
    });

    it('does not auto-select when payment methods list is empty', async () => {
      const store = createMockStore();
      const { Wrapper } = createWrapper(store);

      getPaymentMethodsForContextMock.mockResolvedValue(
        contextResponse([], null),
      );

      const { result } = renderHook(() => useBuyPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(
        Engine.context.RampsController.setSelectedPaymentMethod,
      ).not.toHaveBeenCalled();
      expect(result.current.selectedPaymentMethod).toBeNull();
    });

    it('falls back to the controller suggestion when the selection is stale', async () => {
      const removedMethod: PaymentMethod = {
        id: '/payments/removed',
        paymentType: 'removed',
        name: 'Removed',
        score: 0,
        icon: 'removed',
      };
      const store = createMockStore({
        paymentMethods: {
          ...baseRampsState.paymentMethods,
          selected: removedMethod,
        },
      });
      const { Wrapper } = createWrapper(store);

      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderHook(() => useBuyPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(
        Engine.context.RampsController.setSelectedPaymentMethod,
      ).not.toHaveBeenCalled();
      expect(result.current.selectedPaymentMethod).toEqual(
        mockPaymentMethods[0],
      );
    });

    it('settles loading once the controller commits the corrected selection', async () => {
      const removedMethod: PaymentMethod = {
        id: '/payments/removed',
        paymentType: 'removed',
        name: 'Removed',
        score: 0,
        icon: 'removed',
      };
      const store = createMockStore({
        paymentMethods: {
          ...baseRampsState.paymentMethods,
          selected: removedMethod,
        },
      });
      const { Wrapper } = createWrapper(store);

      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderHook(() => useBuyPaymentMethods(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // The controller commits catalog and selection together, so there is no
      // manual fallback window left to hold isLoading open for.
      expect(result.current.isLoading).toBe(false);
    });
  });

  // The default catalog, and the only one confirmations ever asks for.
  describe('active fiat context', () => {
    const depositTx = (
      type: TransactionType = TransactionType.moneyAccountDeposit,
    ) =>
      ({ id: 'tx-1', type }) as unknown as ReturnType<
        typeof useTransactionMetadataRequest
      >;

    const renderDeposit = (store = createMockStore()) => {
      const { Wrapper } = createWrapper(store);
      return renderHook(() => useRampsPaymentMethods(), { wrapper: Wrapper });
    };

    it('stays idle when the pending approval is not a fiat deposit', () => {
      const { result } = renderDeposit();

      expect(result.current.status).toBe('idle');
      expect(result.current.paymentMethods).toEqual([]);
      expect(getPaymentMethodsForContextMock).not.toHaveBeenCalled();
    });

    it('stays idle when the region is unknown', () => {
      useTransactionMetadataRequestMock.mockReturnValue(depositTx());

      const { result } = renderDeposit(
        createMockStore({
          userRegion: { ...baseRampsState.userRegion, regionCode: null },
        }),
      );

      expect(result.current.status).toBe('idle');
      expect(getPaymentMethodsForContextMock).not.toHaveBeenCalled();
    });

    it('requests the deposit asset read-only, ignoring the Buy token and provider', async () => {
      useTransactionMetadataRequestMock.mockReturnValue(
        depositTx(TransactionType.predictDeposit),
      );
      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderDeposit(
        createMockStore({
          tokens: {
            ...baseRampsState.tokens,
            selected: {
              ...baseRampsState.tokens.selected,
              assetId: 'eip155:1/erc20:0xdead',
            },
          },
          providers: {
            ...baseRampsState.providers,
            selected: { id: '/providers/revolut', name: 'Revolut' },
          },
        }),
      );

      await waitFor(() => expect(result.current.status).toBe('success'));

      expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith({
        region: 'us',
        // The Predict deposit asset, not the token Buy happens to have selected.
        assetId: 'eip155:137/slip44:966',
        autoSelectProvider: true,
        restrictToKnownOrNativeProviders: true,
        updateState: false,
      });
      expect(result.current.paymentMethods).toEqual(mockPaymentMethods);
    });

    it('never writes the Buy selection', async () => {
      useTransactionMetadataRequestMock.mockReturnValue(depositTx());
      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderDeposit(
        createMockStore({
          paymentMethods: {
            ...baseRampsState.paymentMethods,
            selected: staleMethod,
          },
        }),
      );

      await waitFor(() => expect(result.current.status).toBe('success'));

      expect(setSelectedPaymentMethodMock).not.toHaveBeenCalled();
      // Buy's Redux selection must not leak into the deposit result.
      expect(result.current.selectedPaymentMethod).toBeNull();
    });

    it('resolves the selected method from the TPC fiat payment', async () => {
      useTransactionMetadataRequestMock.mockReturnValue(depositTx());
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: mockPaymentMethods[1].id,
      });
      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderDeposit();

      await waitFor(() => expect(result.current.status).toBe('success'));

      expect(result.current.selectedPaymentMethod).toEqual(
        mockPaymentMethods[1],
      );
      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
    });

    it('clears a selected method the deposit asset cannot be served with', async () => {
      // The Revolut Pay case: picked through the previously leaked Buy catalog,
      // it is absent once methods are scoped to the deposit asset.
      useTransactionMetadataRequestMock.mockReturnValue(depositTx());
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: '/payments/revolut-pay',
      });
      getPaymentMethodsForContextMock.mockResolvedValue(contextResponse());

      const { result } = renderDeposit();

      await waitFor(() =>
        expect(updateFiatPaymentMock).toHaveBeenCalledTimes(1),
      );

      const { transactionId, callback } =
        updateFiatPaymentMock.mock.calls[0][0];
      expect(transactionId).toBe('tx-1');
      const fiatPayment = { selectedPaymentMethodId: '/payments/revolut-pay' };
      callback(fiatPayment);
      expect(fiatPayment.selectedPaymentMethodId).toBeUndefined();
      expect(result.current.selectedPaymentMethod).toBeNull();
    });

    it('does not clear the selection on a transient empty result', async () => {
      useTransactionMetadataRequestMock.mockReturnValue(depositTx());
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: mockPaymentMethods[0].id,
      });
      getPaymentMethodsForContextMock.mockResolvedValue(
        contextResponse([], null),
      );

      const { result } = renderDeposit();

      await waitFor(() => expect(result.current.status).toBe('success'));

      expect(updateFiatPaymentMock).not.toHaveBeenCalled();
    });

    it('does not clear the selection while the request is still in flight', async () => {
      useTransactionMetadataRequestMock.mockReturnValue(depositTx());
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: '/payments/revolut-pay',
      });
      const deferred = createDeferred<ContextResponse>();
      getPaymentMethodsForContextMock.mockReturnValue(deferred.promise);

      const { result } = renderDeposit();

      await waitFor(() => expect(result.current.isFetching).toBe(true));
      expect(updateFiatPaymentMock).not.toHaveBeenCalled();

      await act(async () => {
        deferred.resolve(contextResponse());
        await deferred.promise;
      });

      await waitFor(() =>
        expect(updateFiatPaymentMock).toHaveBeenCalledTimes(1),
      );
    });
  });
});
