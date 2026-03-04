import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsProviders } from './useRampsProviders';
import {
  type Provider as RampProvider,
  RampsOrderStatus,
  type RampsOrder,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import {
  determinePreferredProvider,
  completedOrdersFromRampsOrders,
} from '../utils/determinePreferredProvider';
import { getOrders, type FiatOrder } from '../../../../reducers/fiatOrders';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      setSelectedProvider: jest.fn(),
    },
  },
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupWithInternalAccountsAddresses: () => [],
  }),
);

jest.mock('../utils/determinePreferredProvider', () => ({
  determinePreferredProvider: jest.fn(),
  completedOrdersFromFiatOrders: jest.fn(() => []),
  completedOrdersFromRampsOrders: jest.fn(() => []),
}));

const emptyOrders: FiatOrder[] = [];
jest.mock('../../../../reducers/fiatOrders', () => ({
  ...jest.requireActual('../../../../reducers/fiatOrders'),
  getOrders: jest.fn((_state: unknown) => []),
}));

const mockProviders: RampProvider[] = [
  {
    id: 'provider-1',
    name: 'Provider 1',
    environmentType: 'PRODUCTION',
    description: 'Provider 1 Description',
    hqAddress: '123 Provider 1 St, City, ST 12345',
    links: [],
    logos: {
      light: 'https://example.com/logo1-light.png',
      dark: 'https://example.com/logo1-dark.png',
      height: 24,
      width: 79,
    },
  },
  {
    id: 'provider-2',
    name: 'Provider 2',
    environmentType: 'PRODUCTION',
    description: 'Provider 2 Description',
    hqAddress: '456 Provider 2 St, City, ST 12345',
    links: [],
    logos: {
      light: 'https://example.com/logo2-light.png',
      dark: 'https://example.com/logo2-dark.png',
      height: 24,
      width: 79,
    },
  },
];

const createMockStore = (
  providersState: Record<string, unknown> = {},
  rampsState: { orders?: unknown[] } = {},
) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            providers: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
              ...providersState,
            },
            orders: rampsState.orders ?? [],
          },
        },
      }),
      fiatOrders: () => ({
        orders: [],
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns providers, selectedProvider, setSelectedProvider, isLoading, and error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        providers: [],
        selectedProvider: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.setSelectedProvider).toBe('function');
    });
  });

  describe('providers state', () => {
    it('returns providers from state', () => {
      const store = createMockStore({ data: mockProviders });
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.providers).toEqual(mockProviders);
    });

    it('returns empty array when providers are not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.providers).toEqual([]);
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when isLoading is true', () => {
      const store = createMockStore({
        isLoading: true,
      });
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns error from state', () => {
      const store = createMockStore({
        error: 'Network error',
      });
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('selectedProvider state', () => {
    it('returns selectedProvider from state', () => {
      const store = createMockStore({ selected: mockProviders[0] });
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.selectedProvider).toEqual(mockProviders[0]);
    });

    it('returns null when selectedProvider is not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.selectedProvider).toBeNull();
    });
  });

  describe('setSelectedProvider', () => {
    it('calls Engine.context.RampsController.setSelectedProvider with provider id', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.setSelectedProvider(mockProviders[0]);
      });

      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(mockProviders[0].id);
    });

    it('calls Engine.context.RampsController.setSelectedProvider with null when provider is null', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.setSelectedProvider(null);
      });

      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(null);
    });
  });

  describe('preferred provider effect', () => {
    const mockGetOrders = getOrders as jest.MockedFunction<typeof getOrders>;
    const mockDeterminePreferredProvider =
      determinePreferredProvider as jest.MockedFunction<
        typeof determinePreferredProvider
      >;

    it('calls determinePreferredProvider with completed orders and providers when providers exist and selectedProvider is null', () => {
      const store = createMockStore({ data: mockProviders });
      mockGetOrders.mockReturnValue(emptyOrders);
      mockDeterminePreferredProvider.mockReturnValue(mockProviders[0]);

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(mockDeterminePreferredProvider).toHaveBeenCalledWith(
        expect.any(Array),
        mockProviders,
      );
    });

    it('calls setSelectedProvider with result of determinePreferredProvider when providers exist and selectedProvider is null', () => {
      const store = createMockStore({ data: mockProviders });
      mockGetOrders.mockReturnValue(emptyOrders);
      mockDeterminePreferredProvider.mockReturnValue(mockProviders[1]);

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(mockProviders[1].id);
    });

    it('does not call determinePreferredProvider when providers is empty', () => {
      const store = createMockStore();
      mockDeterminePreferredProvider.mockClear();

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(mockDeterminePreferredProvider).not.toHaveBeenCalled();
    });

    it('does not call determinePreferredProvider when selectedProvider is already set and orders are empty', () => {
      const store = createMockStore({
        data: mockProviders,
        selected: mockProviders[0],
      });
      mockDeterminePreferredProvider.mockClear();

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(mockDeterminePreferredProvider).not.toHaveBeenCalled();
    });

    it('re-evaluates when orders appear after initial evaluation with empty orders', () => {
      const mockCompletedOrder: RampsOrder = {
        id: '/providers/provider-2/orders/order-1',
        providerOrderId: 'order-1',
        provider: { id: 'provider-2', name: 'Provider 2' },
        status: RampsOrderStatus.Completed,
        createdAt: 1000,
      } as RampsOrder;

      const initialRampsState = {
        providers: {
          data: mockProviders,
          selected: null as RampProvider | null,
          isLoading: false,
          error: null,
        },
        orders: [] as RampsOrder[],
      };

      const rampsReducer = (
        state: typeof initialRampsState | undefined,
        action: { type: string; payload?: unknown },
      ) => {
        const s = state ?? initialRampsState;
        if (
          action.type === 'ramps/SET_ORDERS' &&
          Array.isArray(action.payload)
        ) {
          return { ...s, orders: action.payload as RampsOrder[] };
        }
        if (
          action.type === 'ramps/SET_SELECTED_PROVIDER' &&
          action.payload &&
          typeof action.payload === 'object' &&
          'id' in (action.payload as object)
        ) {
          return {
            ...state,
            providers: {
              ...state.providers,
              selected: action.payload as RampProvider,
            },
          };
        }
        return s;
      };

      const defaultEngineState = {
        backgroundState: { RampsController: initialRampsState },
      };
      const engineReducer = (
        state: typeof defaultEngineState | undefined,
        action: { type: string; payload?: unknown },
      ) => {
        const s = state ?? defaultEngineState;
        return {
          backgroundState: {
            RampsController: rampsReducer(
              s.backgroundState.RampsController,
              action,
            ),
          },
        };
      };

      const storeWithReducer = configureStore({
        reducer: {
          engine: engineReducer,
          fiatOrders: () => ({ orders: [] }),
        },
      });

      const mockCompletedOrdersFromRampsOrders =
        completedOrdersFromRampsOrders as jest.MockedFunction<
          typeof completedOrdersFromRampsOrders
        >;
      mockCompletedOrdersFromRampsOrders.mockImplementation((orders) =>
        orders
          .filter((o) => o.status === RampsOrderStatus.Completed)
          .map((o) => ({
            providerId: o.provider?.id ?? '',
            completedAt: o.createdAt,
          })),
      );

      mockDeterminePreferredProvider
        .mockReturnValueOnce(mockProviders[0])
        .mockReturnValueOnce(mockProviders[1]);

      const { rerender } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(storeWithReducer),
      });

      expect(mockDeterminePreferredProvider).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(mockProviders[0].id);

      act(() => {
        storeWithReducer.dispatch({
          type: 'ramps/SET_ORDERS',
          payload: [mockCompletedOrder],
        });
      });

      rerender({});

      expect(mockDeterminePreferredProvider).toHaveBeenCalled();
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(mockProviders[0].id);
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenLastCalledWith(mockProviders[1].id);
    });

    it('does not re-evaluate when orders were already present on first run', () => {
      const mockCompletedOrder: RampsOrder = {
        id: '/providers/provider-2/orders/order-1',
        providerOrderId: 'order-1',
        provider: { id: 'provider-2', name: 'Provider 2' },
        status: RampsOrderStatus.Completed,
        createdAt: 1000,
      } as RampsOrder;

      const mockCompletedOrdersFromRampsOrders =
        completedOrdersFromRampsOrders as jest.MockedFunction<
          typeof completedOrdersFromRampsOrders
        >;
      mockCompletedOrdersFromRampsOrders.mockImplementation((orders) =>
        orders
          .filter((o) => o.status === RampsOrderStatus.Completed)
          .map((o) => ({
            providerId: o.provider?.id ?? '',
            completedAt: o.createdAt,
          })),
      );

      const store = createMockStore(
        { data: mockProviders, selected: mockProviders[1] },
        { orders: [mockCompletedOrder] },
      );

      mockDeterminePreferredProvider.mockClear();

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(mockDeterminePreferredProvider).not.toHaveBeenCalled();
    });
  });
});
