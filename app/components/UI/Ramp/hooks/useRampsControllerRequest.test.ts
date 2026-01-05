import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsControllerRequest } from './useRampsControllerRequest';
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

describe('useRampsControllerRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context as { RampsController: unknown }).RampsController = null;
  });

  describe('cache key and selector creation', () => {
    it('creates correct cache key from method and params', () => {
      const store = createMockStore();
      setupMockRampsController();
      const expectedCacheKey = createCacheKey('updateGeolocation', []);

      const { result } = renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current.status).toBe('idle');
      expect(expectedCacheKey).toBe('updateGeolocation:[]');
    });

    it('creates different cache keys for different params', () => {
      const params1 = ['param1'];
      const params2 = ['param2'];
      const cacheKey1 = createCacheKey('testMethod', params1);
      const cacheKey2 = createCacheKey('testMethod', params2);

      const store = createMockStore({
        requests: {
          [cacheKey1]: {
            status: RequestStatus.SUCCESS,
            data: 'data1',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
          [cacheKey2]: {
            status: RequestStatus.SUCCESS,
            data: 'data2',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      setupMockRampsController({ testMethod: jest.fn() });

      const { result: result1 } = renderHook(
        () =>
          useRampsControllerRequest<string>('testMethod', params1, {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      const { result: result2 } = renderHook(
        () =>
          useRampsControllerRequest<string>('testMethod', params2, {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(result1.current.data).toBe('data1');
      expect(result2.current.data).toBe('data2');
    });
  });

  describe('status from redux state', () => {
    it('returns idle status when no request has been made', () => {
      const store = createMockStore();
      setupMockRampsController();

      const { result } = renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        status: 'idle',
        data: null,
        error: null,
      });
    });

    it('returns loading status from redux when request is in progress', () => {
      const cacheKey = createCacheKey('updateGeolocation', []);
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
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        status: 'loading',
        data: null,
        error: null,
      });
    });

    it('returns success status and data from redux when request completed', () => {
      const cacheKey = createCacheKey('updateGeolocation', []);
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
        () =>
          useRampsControllerRequest<string>('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        status: 'success',
        data: 'US-CA',
        error: null,
      });
    });

    it('returns error status and message from redux when request failed', () => {
      const cacheKey = createCacheKey('updateGeolocation', []);
      const store = createMockStore({
        requests: {
          [cacheKey]: {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });
      setupMockRampsController();

      const { result } = renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(result.current).toMatchObject({
        status: 'error',
        data: null,
        error: 'Network error',
      });
    });
  });

  describe('onMount behavior', () => {
    it('executes request on mount by default when onMount option is not provided', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      renderHook(() => useRampsControllerRequest('updateGeolocation', []), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalledTimes(1);
      });
    });

    it('executes request on mount when onMount is true', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], { onMount: true }),
        { wrapper: wrapper(store) },
      );

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalledTimes(1);
      });
    });

    it('does not execute request on mount when onMount is false', () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(mockUpdateGeolocation).not.toHaveBeenCalled();
    });

    it('only executes request once on mount', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      const { rerender } = renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], { onMount: true }),
        { wrapper: wrapper(store) },
      );

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalledTimes(1);
      });

      rerender({});

      expect(mockUpdateGeolocation).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute options', () => {
    it('passes forceRefresh option to the controller method', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: true,
            forceRefresh: true,
          }),
        { wrapper: wrapper(store) },
      );

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalledWith({
          forceRefresh: true,
          ttl: undefined,
        });
      });
    });

    it('passes ttl option to the controller method', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: true,
            ttl: 60000,
          }),
        { wrapper: wrapper(store) },
      );

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalledWith({
          forceRefresh: false,
          ttl: 60000,
        });
      });
    });
  });

  describe('error handling', () => {
    it('handles execute errors silently when request fails on mount', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = jest
        .fn()
        .mockRejectedValue(new Error('Request failed'));
      setupMockRampsController({ updateGeolocation: mockUpdateGeolocation });

      const { result } = renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], { onMount: true }),
        { wrapper: wrapper(store) },
      );

      await waitFor(() => {
        expect(mockUpdateGeolocation).toHaveBeenCalled();
      });

      expect(result.current.status).toBe('idle');
    });
  });

  describe('abort behavior', () => {
    it('aborts request on unmount', async () => {
      const store = createMockStore();
      const mockAbortRequest = jest.fn().mockReturnValue(true);
      setupMockRampsController({ abortRequest: mockAbortRequest });

      const { unmount } = renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      unmount();

      expect(mockAbortRequest).toHaveBeenCalledWith('updateGeolocation:[]');
    });

    it('returns false from abort when RampsController is not available', () => {
      const store = createMockStore();
      (Engine.context as { RampsController: unknown }).RampsController = null;

      const { unmount } = renderHook(
        () =>
          useRampsControllerRequest('updateGeolocation', [], {
            onMount: false,
          }),
        { wrapper: wrapper(store) },
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
