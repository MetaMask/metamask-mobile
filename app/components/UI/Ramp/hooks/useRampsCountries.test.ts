import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsCountries } from './useRampsCountries';
import { RequestStatus, type Country } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

const mockCountries: Country[] = [
  {
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
  {
    isoCode: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    phone: {
      prefix: '+1',
      placeholder: '(XXX) XXX-XXXX',
      template: 'XXX-XXX-XXXX',
    },
    currency: 'CAD',
    supported: true,
  },
];

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getCountries: jest.fn().mockResolvedValue(mockCountries),
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
            preferredProvider: null,
            providers: [],
            tokens: null,
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

describe('useRampsCountries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      Engine.context.RampsController.getCountries as jest.Mock
    ).mockResolvedValue(mockCountries);
  });

  describe('return value structure', () => {
    it('returns isLoading, error, countries, and fetchCountries', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        isLoading: false,
        error: null,
        countries: null,
      });
      expect(typeof result.current.fetchCountries).toBe('function');
    });
  });

  describe('action parameter', () => {
    it('defaults to buy when not provided', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toBeDefined();
    });

    it('uses buy action when provided', () => {
      const store = createMockStore({
        requests: {
          'getCountries:["buy"]': {
            status: RequestStatus.SUCCESS,
            data: mockCountries,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsCountries('buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.countries).toEqual(mockCountries);
    });

    it('uses sell action when provided', () => {
      const store = createMockStore({
        requests: {
          'getCountries:["sell"]': {
            status: RequestStatus.SUCCESS,
            data: mockCountries,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsCountries('sell'), {
        wrapper: wrapper(store),
      });
      expect(result.current.countries).toEqual(mockCountries);
    });
  });

  describe('countries state', () => {
    it('returns countries from request data', () => {
      const store = createMockStore({
        requests: {
          'getCountries:["buy"]': {
            status: RequestStatus.SUCCESS,
            data: mockCountries,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsCountries('buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.countries).toEqual(mockCountries);
    });

    it('returns null when data is not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.countries).toBeNull();
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when request is loading', () => {
      const store = createMockStore({
        requests: {
          'getCountries:["buy"]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsCountries('buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading false when request is not loading', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('returns error from request state', () => {
      const store = createMockStore({
        requests: {
          'getCountries:["buy"]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      const { result } = renderHook(() => useRampsCountries('buy'), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchCountries', () => {
    it('calls getCountries with hook action when called without arguments', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries('sell'), {
        wrapper: wrapper(store),
      });
      await result.current.fetchCountries();
      expect(Engine.context.RampsController.getCountries).toHaveBeenCalledWith(
        'sell',
        undefined,
      );
    });

    it('calls getCountries with provided action', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries('buy'), {
        wrapper: wrapper(store),
      });
      await result.current.fetchCountries('sell');
      expect(Engine.context.RampsController.getCountries).toHaveBeenCalledWith(
        'sell',
        undefined,
      );
    });

    it('calls getCountries with options when provided', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchCountries('buy', { forceRefresh: true });
      expect(Engine.context.RampsController.getCountries).toHaveBeenCalledWith(
        'buy',
        { forceRefresh: true },
      );
    });

    it('returns countries data', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      const countries = await result.current.fetchCountries();
      expect(countries).toEqual(mockCountries);
    });

    it('rejects with error when getCountries fails', async () => {
      const store = createMockStore();
      const mockGetCountries = Engine.context.RampsController
        .getCountries as jest.Mock;
      mockGetCountries.mockReset();
      mockGetCountries.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });

      await expect(result.current.fetchCountries()).rejects.toThrow(
        'Network error',
      );
    });
  });
});
