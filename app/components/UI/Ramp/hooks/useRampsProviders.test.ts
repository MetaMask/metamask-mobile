import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsProviders } from './useRampsProviders';
import { type Provider as RampProvider } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';
import { determinePreferredProvider } from '../utils/determinePreferredProvider';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      setSelectedProvider: jest.fn(),
    },
  },
}));

jest.mock('../../../../reducers/fiatOrders', () => {
  const orders: never[] = [];
  return {
    ...jest.requireActual('../../../../reducers/fiatOrders'),
    getOrders: jest.fn(() => orders),
  };
});

jest.mock('../utils/determinePreferredProvider', () => ({
  determinePreferredProvider: jest.fn(),
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

const createMockStore = (providersState = {}) =>
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
          },
        },
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

  describe('preferred provider useEffect', () => {
    it('sets selectedProvider to preferred provider when providers load and none selected', () => {
      (determinePreferredProvider as jest.Mock).mockReturnValue(mockProviders[0]);
      const store = createMockStore({
        data: mockProviders,
        selected: null,
        isLoading: false,
      });
      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(determinePreferredProvider).toHaveBeenCalledWith(
        [],
        mockProviders,
      );
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).toHaveBeenCalledWith(mockProviders[0].id);
    });

    it('does not set selectedProvider when one is already selected', () => {
      (determinePreferredProvider as jest.Mock).mockReturnValue(mockProviders[1]);
      const store = createMockStore({
        data: mockProviders,
        selected: mockProviders[0],
        isLoading: false,
      });
      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(determinePreferredProvider).not.toHaveBeenCalled();
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).not.toHaveBeenCalled();
    });

    it('does not set selectedProvider when providers are still loading', () => {
      (determinePreferredProvider as jest.Mock).mockReturnValue(mockProviders[0]);
      const store = createMockStore({
        data: mockProviders,
        selected: null,
        isLoading: true,
      });
      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(determinePreferredProvider).not.toHaveBeenCalled();
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).not.toHaveBeenCalled();
    });

    it('does not set selectedProvider when preferred is null', () => {
      (determinePreferredProvider as jest.Mock).mockReturnValue(null);
      const store = createMockStore({
        data: mockProviders,
        selected: null,
        isLoading: false,
      });
      renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(determinePreferredProvider).toHaveBeenCalledWith(
        [],
        mockProviders,
      );
      expect(
        Engine.context.RampsController.setSelectedProvider,
      ).not.toHaveBeenCalled();
    });
  });
});
