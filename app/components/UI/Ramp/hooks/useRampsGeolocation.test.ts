import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsGeolocation } from './useRampsGeolocation';
import { RequestStatus, createCacheKey } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: null,
  },
}));

const createMockStore = (rampsControllerState = {}) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            geolocation: null,
            requests: {},
            ...rampsControllerState,
          },
        },
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(Provider, { store } as any, children);
  };

const setupMockRampsController = (overrides = {}) => {
  const mockController = {
    updateGeolocation: jest.fn().mockResolvedValue('US'),
    abortRequest: jest.fn().mockReturnValue(false),
    ...overrides,
  };
  (Engine.context as { RampsController: unknown }).RampsController =
    mockController;
  return mockController;
};

describe('useRampsGeolocation', () => {
  const cacheKey = createCacheKey('updateGeolocation', []);

  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context as { RampsController: unknown }).RampsController = null;
  });

  describe('return value structure', () => {
    it('returns geolocation, isLoading, and error properties', () => {
      const store = createMockStore();
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        geolocation: null,
        isLoading: false,
        error: null,
      });
    });
  });

  describe('default options', () => {
    it('uses default empty options when no options provided', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toMatchObject({
        geolocation: null,
        isLoading: false,
        error: null,
      });

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalled();
      });
    });
  });

  describe('geolocation state', () => {
    it('returns null geolocation when not yet fetched', () => {
      const store = createMockStore();
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.geolocation).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('returns geolocation from request cache when available', () => {
      const store = createMockStore({
        requests: {
          [cacheKey]: {
            status: RequestStatus.SUCCESS,
            data: 'US-CA',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        geolocation: 'US-CA',
        isLoading: false,
        error: null,
      });
    });

    it('returns null when request data is not yet loaded', () => {
      const store = createMockStore({
        requests: {},
      });
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.geolocation).toBeNull();
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when request is in progress', () => {
      const store = createMockStore({
        requests: {
          [cacheKey]: {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        geolocation: null,
        isLoading: true,
        error: null,
      });
    });

    it('returns isLoading false when request is not loading', () => {
      const store = createMockStore({
        requests: {
          [cacheKey]: {
            status: RequestStatus.SUCCESS,
            data: 'US',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('returns error when request failed', () => {
      const store = createMockStore({
        requests: {
          [cacheKey]: {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Failed to fetch geolocation',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        geolocation: null,
        isLoading: false,
        error: 'Failed to fetch geolocation',
      });
    });

    it('returns null error when request succeeded', () => {
      const store = createMockStore({
        requests: {
          [cacheKey]: {
            status: RequestStatus.SUCCESS,
            data: 'US',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      setupMockRampsController();

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.error).toBeNull();
    });
  });

  describe('onMount behavior', () => {
    it('fetches geolocation on mount by default', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.geolocation).toBeNull();

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalled();
      });
    });

    it('does not fetch on mount when onMount is false', () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      const { result } = renderHook(
        () => useRampsGeolocation({ onMount: false }),
        {
          wrapper: wrapper(store),
        },
      );

      expect(result.current.geolocation).toBeNull();
      expect(mockUpdateGeolocation).not.toHaveBeenCalled();
    });
  });
});
