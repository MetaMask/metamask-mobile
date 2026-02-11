import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsCountries } from './useRampsCountries';
import { type Country } from '@metamask/ramps-controller';

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
    supported: { buy: true, sell: true },
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
    supported: { buy: true, sell: true },
  },
];

const createMockStore = (countriesState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            countries: {
              data: [],
              selected: null,
              isLoading: false,
              error: null,
              ...countriesState,
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

describe('useRampsCountries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns countries, isLoading, and error', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        countries: [],
        isLoading: false,
        error: null,
      });
    });
  });

  describe('countries state', () => {
    it('returns countries from state', () => {
      const store = createMockStore({ data: mockCountries });
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.countries).toEqual(mockCountries);
    });

    it('returns empty array when countries are not available', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.countries).toEqual([]);
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when isLoading is true', () => {
      const store = createMockStore({
        isLoading: true,
      });
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading false when isLoading is false', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('returns error from state', () => {
      const store = createMockStore({
        error: 'Network error',
      });
      const { result } = renderHook(() => useRampsCountries(), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });
});
