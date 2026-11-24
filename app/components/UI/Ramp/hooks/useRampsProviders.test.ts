import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsProviders } from './useRampsProviders';
import {
  getLastUserProviderPick,
  useBuyScreenOwnsProviderPick,
} from './providerPickCoordination';
import { type Provider as RampProvider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';

const mockAheadOfHistory: string[] = [];
jest.mock(
  '../../../../selectors/featureFlagController/rampsProvidersAheadOfHistory',
  () => ({
    selectRampsProvidersAheadOfHistory: () => mockAheadOfHistory,
  }),
);

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  locale: 'en',
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      setSelectedProvider: jest.fn(),
      selectProviderForAsset: jest.fn(),
      getProviders: jest.fn().mockResolvedValue({ providers: [], sorted: [] }),
      state: {
        providers: { selected: null },
        providerAutoSelected: false,
        tokens: { selected: null },
      },
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQuery: jest.fn(),
}));

const mockUseQuery = jest.requireMock('@tanstack/react-query')
  .useQuery as jest.Mock;

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

const NO_LEGACY_ORDERS: unknown[] = [];

const createMockStore = (
  providersState = {},
  userRegion = { regionCode: 'us', country: { currency: 'USD' } },
  {
    orders = [],
    legacyOrders = NO_LEGACY_ORDERS,
  }: { orders?: unknown[]; legacyOrders?: unknown[] } = {},
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
            orders,
          },
        },
      }),
      fiatOrders: () => ({
        orders: legacyOrders,
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
    it('supports providers responses from older controller versions without sorted metadata', () => {
      mockUseQuery.mockReturnValueOnce({
        data: { providers: mockProviders },
        error: null,
        isLoading: false,
      } as never);
      const store = createMockStore();

      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(result.current.providers).toEqual(mockProviders);
    });

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

    it('returns localized fallback when the provider state carries a circuit breaker errorKey', () => {
      const store = createMockStore({
        error: 'Execution prevented because the circuit breaker is open',
        errorKey: 'CIRCUIT_BREAKER_OPEN',
      });
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(result.current.error).toBe('fiat_on_ramp.circuit_breaker_open');
    });

    it('returns localized fallback when the providers query carries a circuit breaker errorKey', () => {
      const circuitBreakerError = Object.assign(
        new Error('Execution prevented because the circuit breaker is open'),
        { errorKey: 'CIRCUIT_BREAKER_OPEN' },
      );
      mockUseQuery.mockReturnValueOnce({
        data: undefined,
        error: circuitBreakerError,
        isLoading: false,
      } as never);

      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      expect(result.current.error).toBe('fiat_on_ramp.circuit_breaker_open');
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

    it('records a provider the user picks by hand', () => {
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(createMockStore()),
      });
      const before = getLastUserProviderPick().count;

      act(() => {
        result.current.setSelectedProvider(mockProviders[0], {
          autoSelected: true,
        });
      });
      expect(getLastUserProviderPick().count).toBe(before);

      act(() => {
        result.current.setSelectedProvider(mockProviders[0], {
          userSelected: true,
        });
      });
      expect(getLastUserProviderPick()).toEqual({
        providerId: mockProviders[0].id,
        count: before + 1,
      });
    });
  });

  describe('provider pick on start-up and history change', () => {
    const mockController = Engine.context.RampsController as unknown as {
      selectProviderForAsset: jest.Mock;
      state: {
        providers: { selected: RampProvider | null };
        providerAutoSelected: boolean;
        tokens: { selected: { assetId: string } | null };
      };
    };
    const ETH = 'eip155:1/slip44:60';
    const nativeProvider = {
      ...mockProviders[1],
      id: 'transak-native',
      type: 'native',
    } as RampProvider;

    beforeEach(() => {
      mockUseQuery.mockReturnValue(undefined);
      mockAheadOfHistory.length = 0;
      mockController.state = {
        providers: { selected: null },
        providerAutoSelected: false,
        tokens: { selected: null },
      };
    });

    it('picks for the controller token with the flag list and legacy history', () => {
      mockAheadOfHistory.push('crossmint');
      mockController.state.tokens.selected = { assetId: ETH };
      const store = createMockStore(
        { data: [mockProviders[0], nativeProvider] },
        undefined,
        {
          legacyOrders: [
            {
              id: 'a',
              provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
              state: FIAT_ORDER_STATES.COMPLETED,
              orderType: 'DEPOSIT',
              createdAt: 200,
            },
          ],
        },
      );

      renderHook(() => useRampsProviders({ enableSideEffects: true }), {
        wrapper: wrapper(store),
      });

      expect(mockController.selectProviderForAsset).toHaveBeenCalledWith(ETH, {
        aheadOfHistory: ['crossmint'],
        extraHistory: [{ providerId: 'transak-native', completedAt: 200 }],
      });
    });

    it('picks with a null asset before a token is chosen', () => {
      const store = createMockStore({ data: mockProviders });

      renderHook(() => useRampsProviders({ enableSideEffects: true }), {
        wrapper: wrapper(store),
      });

      expect(mockController.selectProviderForAsset).toHaveBeenCalledWith(null, {
        aheadOfHistory: [],
        extraHistory: [],
      });
    });

    let currentStore = createMockStore({ data: mockProviders });

    it('picks again when order history changes and the app made the selection', () => {
      currentStore = createMockStore({ data: mockProviders });
      mockController.state.providers.selected = mockProviders[0];
      mockController.state.providerAutoSelected = true;
      const { rerender } = renderHook(
        () => useRampsProviders({ enableSideEffects: true }),
        {
          wrapper: ({ children }: { children: React.ReactNode }) =>
            React.createElement(
              Provider,
              { store: currentStore } as never,
              React.createElement(
                QueryClientProvider,
                { client: queryClient },
                children,
              ),
            ),
        },
      );
      expect(mockController.selectProviderForAsset).toHaveBeenCalledTimes(1);

      const order = {
        id: 'order-1',
        provider: { id: mockProviders[0].id },
        orderType: 'BUY',
        createdAt: 1,
      };
      currentStore = createMockStore({ data: mockProviders }, undefined, {
        orders: [{ ...order, status: 'PENDING' }],
      });
      rerender({});
      expect(mockController.selectProviderForAsset).toHaveBeenCalledTimes(1);

      currentStore = createMockStore({ data: mockProviders }, undefined, {
        orders: [{ ...order, status: 'COMPLETED' }],
      });
      rerender({});

      expect(mockController.selectProviderForAsset).toHaveBeenCalledTimes(2);
    });

    it('picks again when the controller list arrives after the React Query copy', () => {
      mockUseQuery.mockReturnValue({
        data: { providers: mockProviders },
        isLoading: false,
        error: null,
      });
      currentStore = createMockStore({ data: [] });
      const { rerender } = renderHook(
        () => useRampsProviders({ enableSideEffects: true }),
        {
          wrapper: ({ children }: { children: React.ReactNode }) =>
            React.createElement(
              Provider,
              { store: currentStore } as never,
              React.createElement(
                QueryClientProvider,
                { client: queryClient },
                children,
              ),
            ),
        },
      );
      expect(mockController.selectProviderForAsset).toHaveBeenCalledTimes(1);

      currentStore = createMockStore({ data: mockProviders });
      rerender({});

      expect(mockController.selectProviderForAsset).toHaveBeenCalledTimes(2);
    });

    it('picks again when the selection is cleared', () => {
      mockController.state.providers.selected = mockProviders[0];
      mockController.state.providerAutoSelected = false;
      currentStore = createMockStore({
        data: mockProviders,
        selected: mockProviders[0],
      });
      const { rerender } = renderHook(
        () => useRampsProviders({ enableSideEffects: true }),
        {
          wrapper: ({ children }: { children: React.ReactNode }) =>
            React.createElement(
              Provider,
              { store: currentStore } as never,
              React.createElement(
                QueryClientProvider,
                { client: queryClient },
                children,
              ),
            ),
        },
      );
      currentStore = createMockStore({
        data: mockProviders,
        selected: mockProviders[0],
      });
      rerender({});
      expect(mockController.selectProviderForAsset).not.toHaveBeenCalled();

      mockController.state.providers.selected = null;
      currentStore = createMockStore({ data: mockProviders, selected: null });
      rerender({});

      expect(mockController.selectProviderForAsset).toHaveBeenCalledTimes(1);
    });

    it('leaves a selection the app did not make', () => {
      mockController.state.providers.selected = mockProviders[0];
      mockController.state.providerAutoSelected = false;
      const store = createMockStore({ data: mockProviders });

      renderHook(() => useRampsProviders({ enableSideEffects: true }), {
        wrapper: wrapper(store),
      });

      expect(mockController.selectProviderForAsset).not.toHaveBeenCalled();
    });

    it('leaves the pick to a mounted Buy screen', () => {
      const store = createMockStore({ data: mockProviders });
      const buyScreen = renderHook(() => useBuyScreenOwnsProviderPick());

      renderHook(() => useRampsProviders({ enableSideEffects: true }), {
        wrapper: wrapper(store),
      });
      expect(mockController.selectProviderForAsset).not.toHaveBeenCalled();

      buyScreen.unmount();
      renderHook(() => useRampsProviders({ enableSideEffects: true }), {
        wrapper: wrapper(store),
      });
      expect(mockController.selectProviderForAsset).toHaveBeenCalledTimes(1);
    });

    it('does not pick without side effects', () => {
      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(createMockStore({ data: mockProviders })),
      });

      expect(mockController.selectProviderForAsset).not.toHaveBeenCalled();
    });

    it('forwards picker options and exclusions from selectProviderForAsset', () => {
      mockAheadOfHistory.push('crossmint');
      mockController.selectProviderForAsset.mockReturnValue('provider-2');
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(createMockStore({ data: mockProviders })),
      });

      expect(
        result.current.selectProviderForAsset(ETH, {
          excludeProviderIds: ['provider-1'],
        }),
      ).toBe('provider-2');
      expect(mockController.selectProviderForAsset).toHaveBeenCalledWith(ETH, {
        aheadOfHistory: ['crossmint'],
        extraHistory: [],
        excludeProviderIds: ['provider-1'],
      });
    });
  });
});
