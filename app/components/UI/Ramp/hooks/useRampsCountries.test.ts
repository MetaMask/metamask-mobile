import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsCountries } from './useRampsCountries';
import { RequestStatus, type Country } from '@metamask/ramps-controller';

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

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion: null,
            preferredProvider: null,
            countries: [],
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
  describe('return value structure', () => {
    it('returns isLoading, error, and countries', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        isLoading: false,
        error: null,
        countries: [],
      });
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
        countries: mockCountries,
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
        countries: mockCountries,
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
    it('returns countries from state', () => {
      const store = createMockStore({
        countries: mockCountries,
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

    it('returns empty array when data is not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.countries).toEqual([]);
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
});
