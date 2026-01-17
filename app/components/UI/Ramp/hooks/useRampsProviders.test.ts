import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsProviders } from './useRampsProviders';
import {
  RequestStatus,
  type UserRegion,
  type Provider as RampProvider,
} from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

const mockUserRegion: UserRegion = {
  country: {
    isoCode: 'US',
    name: 'United States',
    flag: '🇺🇸',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'USD',
    supported: true,
  },
  state: { stateId: 'CA', name: 'California' },
  regionCode: 'us-ca',
};

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

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getProviders: jest.fn().mockResolvedValue({ providers: mockProviders }),
    },
  },
}));

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion: null,
            providers: [],
            requests: {},
            ...rampsControllerState,
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
    (
      Engine.context.RampsController.getProviders as jest.Mock
    ).mockResolvedValue({ providers: mockProviders });
  });

  describe('return value structure', () => {
    it('returns providers, isLoading, error, and fetchProviders', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        providers: [],
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchProviders).toBe('function');
    });
  });

  describe('region parameter', () => {
    it('uses provided region when specified', () => {
      const store = createMockStore({
        requests: {
          'getProviders:["us-ny",null,null,null,null]': {
            status: RequestStatus.SUCCESS,
            data: { providers: mockProviders },
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsProviders('us-ny'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('uses userRegion from state when region not provided', () => {
      const store = createMockStore({
        userRegion: mockUserRegion,
        requests: {
          'getProviders:["us-ca",null,null,null,null]': {
            status: RequestStatus.SUCCESS,
            data: { providers: mockProviders },
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('uses empty string when region and userRegion are not available', () => {
      const store = createMockStore({
        requests: {
          'getProviders:["",null,null,null,null]': {
            status: RequestStatus.SUCCESS,
            data: { providers: mockProviders },
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('filterOptions parameter', () => {
    it('uses filterOptions in request selector', () => {
      const store = createMockStore({
        requests: {
          'getProviders:["us-ca","provider-1","ETH","USD",null]': {
            status: RequestStatus.SUCCESS,
            data: { providers: mockProviders },
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(
        () =>
          useRampsProviders('us-ca', {
            provider: 'provider-1',
            crypto: 'ETH',
            fiat: 'USD',
          }),
        {
          wrapper: wrapper(store),
        },
      );
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('providers state', () => {
    it('returns providers from state', () => {
      const store = createMockStore({ providers: mockProviders });
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
    it('returns isLoading true when request is loading', () => {
      const store = createMockStore({
        requests: {
          'getProviders:["us-ca",null,null,null,null]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsProviders('us-ca'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns error from request state', () => {
      const store = createMockStore({
        requests: {
          'getProviders:["us-ca",null,null,null,null]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsProviders('us-ca'), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchProviders', () => {
    it('calls getProviders with region when provided', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchProviders('us-ny');
      expect(Engine.context.RampsController.getProviders).toHaveBeenCalledWith(
        'us-ny',
        undefined,
      );
    });

    it('calls getProviders with options when provided', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchProviders('us-ca', {
        forceRefresh: true,
        provider: 'provider-1',
        crypto: 'ETH',
      });
      expect(Engine.context.RampsController.getProviders).toHaveBeenCalledWith(
        'us-ca',
        {
          forceRefresh: true,
          provider: 'provider-1',
          crypto: 'ETH',
        },
      );
    });

    it('returns providers data', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });
      const response = await result.current.fetchProviders('us-ca');
      expect(response).toEqual({ providers: mockProviders });
    });

    it('rejects with error when getProviders fails', async () => {
      const store = createMockStore();
      const mockGetProviders = Engine.context.RampsController
        .getProviders as jest.Mock;
      mockGetProviders.mockReset();
      mockGetProviders.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRampsProviders(), {
        wrapper: wrapper(store),
      });

      await expect(result.current.fetchProviders()).rejects.toThrow(
        'Network error',
      );
    });
  });
});
