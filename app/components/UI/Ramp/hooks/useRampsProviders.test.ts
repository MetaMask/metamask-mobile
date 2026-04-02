import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsProviders } from './useRampsProviders';
import { type Provider as RampProvider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { determinePreferredProvider } from '../utils/determinePreferredProvider';
import { getOrders, type FiatOrder } from '../../../../reducers/fiatOrders';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      setSelectedProvider: jest.fn(),
      getProviders: jest.fn().mockResolvedValue({ providers: [] }),
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));

const mockSelectedAccountGroupAddresses: string[] = [];

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/multichainAccounts/accountTreeController',
    ),
    selectSelectedAccountGroupWithInternalAccountsAddresses: () =>
      mockSelectedAccountGroupAddresses,
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
  getOrders: jest.fn((_state: unknown) => emptyOrders),
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
  providersState = {},
  userRegion = { regionCode: 'us', country: { currency: 'USD' } },
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
            userRegion,
            orders: [],
          },
        },
      }),
      fiatOrders: () => ({
        orders: [],
      }),
    },
  });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper =
  (store: ReturnType<typeof createMockStore>) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      { store } as never,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    );

describe('useRampsProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('providers query', () => {
    const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

    it('triggers providers query when regionCode is available', () => {
      const store = createMockStore();
      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        }),
      );
    });
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
      ).toHaveBeenCalledWith(mockProviders[0].id, undefined);
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
      ).toHaveBeenCalledWith(null, undefined);
    });

    it('forwards options to the controller', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.setSelectedProvider(mockProviders[0], {
          autoSelected: true,
        });
      });

      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(mockProviders[0].id, { autoSelected: true });
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
      mockDeterminePreferredProvider.mockReturnValue({
        provider: mockProviders[0],
        autoSelected: false,
      });

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
      mockDeterminePreferredProvider.mockReturnValue({
        provider: mockProviders[1],
        autoSelected: false,
      });

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(mockProviders[1], { autoSelected: false });
    });

    it('does not call setSelectedProvider when determinePreferredProvider returns null', () => {
      const store = createMockStore({ data: mockProviders });
      mockGetOrders.mockReturnValue(emptyOrders);
      mockDeterminePreferredProvider.mockReturnValue(null);

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).not.toHaveBeenCalled();
    });

    it('does not call determinePreferredProvider when providers is empty', () => {
      const store = createMockStore();
      mockDeterminePreferredProvider.mockClear();

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(mockDeterminePreferredProvider).not.toHaveBeenCalled();
    });

    it('does not call determinePreferredProvider when selectedProvider is already set', () => {
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

    it('does not call determinePreferredProvider when providers is undefined', () => {
      const store = createMockStore({ data: undefined });
      mockDeterminePreferredProvider.mockClear();

      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(mockDeterminePreferredProvider).not.toHaveBeenCalled();
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).not.toHaveBeenCalled();
    });
  });
});
