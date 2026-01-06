import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsGeolocation } from './useRampsGeolocation';
import { RequestStatus } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
    },
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
    return React.createElement(Provider, { store } as never, children);
  };

describe('useRampsGeolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns geolocation, isLoading, error, and fetchGeolocation', () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toMatchObject({
        geolocation: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchGeolocation).toBe('function');
    });
  });

  describe('geolocation state', () => {
    it('returns geolocation from state', () => {
      const store = createMockStore({ geolocation: 'US-CA' });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.geolocation).toBe('US-CA');
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when request is loading', () => {
      const store = createMockStore({
        requests: {
          'updateGeolocation:[]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns error from request state', () => {
      const store = createMockStore({
        requests: {
          'updateGeolocation:[]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Network error',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchGeolocation', () => {
    it('calls updateGeolocation without options when called with no arguments', async () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await result.current.fetchGeolocation();

      expect(
        Engine.context.RampsController.updateGeolocation,
      ).toHaveBeenCalledWith(undefined);
    });

    it('calls updateGeolocation with forceRefresh true when specified', async () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await result.current.fetchGeolocation({ forceRefresh: true });

      expect(
        Engine.context.RampsController.updateGeolocation,
      ).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });

    it('calls updateGeolocation with forceRefresh false when specified', async () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await result.current.fetchGeolocation({ forceRefresh: false });

      expect(
        Engine.context.RampsController.updateGeolocation,
      ).toHaveBeenCalledWith({
        forceRefresh: false,
      });
    });

    it('handles error when fetchGeolocation rejects', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = Engine.context.RampsController
        .updateGeolocation as jest.Mock;
      mockUpdateGeolocation.mockReset();
      mockUpdateGeolocation.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await expect(result.current.fetchGeolocation()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('useEffect error handling', () => {
    it('handles error gracefully when updateGeolocation rejects in useEffect', async () => {
      const store = createMockStore();
      const mockUpdateGeolocation = Engine.context.RampsController
        .updateGeolocation as jest.Mock;
      mockUpdateGeolocation.mockReset();
      mockUpdateGeolocation.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(result.current).toMatchObject({
        geolocation: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchGeolocation).toBe('function');
    });
  });
});
