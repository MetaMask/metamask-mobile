import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsGeolocation } from './useRampsGeolocation';
import { RequestStatus } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      updateUserRegion: jest.fn().mockResolvedValue('US'),
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
    it('returns geolocation property', () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toHaveProperty('geolocation');
      expect(result.current.geolocation).toBe(null);
    });

    it('returns isLoading property', () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toHaveProperty('isLoading');
      expect(result.current.isLoading).toBe(false);
    });

    it('returns error property', () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toHaveProperty('error');
      expect(result.current.error).toBe(null);
    });

    it('returns fetchGeolocation function', () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current).toHaveProperty('fetchGeolocation');
      expect(typeof result.current.fetchGeolocation).toBe('function');
    });
  });

  describe('geolocation state', () => {
    it('returns geolocation from state', () => {
      const store = createMockStore({ userRegion: 'US-CA' });

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
          'updateUserRegion:[]': {
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
          'updateUserRegion:[]': {
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
    it('calls updateUserRegion without options when called with no arguments', async () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await result.current.fetchGeolocation();

      expect(
        Engine.context.RampsController.updateUserRegion,
      ).toHaveBeenCalledWith(undefined);
    });

    it('calls updateUserRegion with forceRefresh true when specified', async () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await result.current.fetchGeolocation({ forceRefresh: true });

      expect(
        Engine.context.RampsController.updateUserRegion,
      ).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });

    it('calls updateUserRegion with forceRefresh false when specified', async () => {
      const store = createMockStore();

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await result.current.fetchGeolocation({ forceRefresh: false });

      expect(
        Engine.context.RampsController.updateUserRegion,
      ).toHaveBeenCalledWith({
        forceRefresh: false,
      });
    });

    it('rejects with error when updateUserRegion fails', async () => {
      const store = createMockStore();
      const mockUpdateUserRegion = Engine.context.RampsController
        .updateUserRegion as jest.Mock;
      mockUpdateUserRegion.mockReset();
      mockUpdateUserRegion.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await expect(result.current.fetchGeolocation()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('useEffect behavior', () => {
    it('calls fetchGeolocation on mount', async () => {
      const store = createMockStore();
      const mockUpdateUserRegion = Engine.context.RampsController
        .updateUserRegion as jest.Mock;
      mockUpdateUserRegion.mockResolvedValue('US-CA');

      renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(mockUpdateUserRegion).toHaveBeenCalledTimes(1);
      });
    });

    it('calls fetchGeolocation with undefined options on mount', async () => {
      const store = createMockStore();
      const mockUpdateUserRegion = Engine.context.RampsController
        .updateUserRegion as jest.Mock;
      mockUpdateUserRegion.mockResolvedValue('US-CA');

      renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(mockUpdateUserRegion).toHaveBeenCalledWith(undefined);
      });
    });

    it('returns default state when updateUserRegion rejects in useEffect', async () => {
      const store = createMockStore();
      const mockUpdateUserRegion = Engine.context.RampsController
        .updateUserRegion as jest.Mock;
      mockUpdateUserRegion.mockReset();
      mockUpdateUserRegion.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(mockUpdateUserRegion).toHaveBeenCalled();
      });

      expect(result.current).toMatchObject({
        geolocation: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchGeolocation).toBe('function');
    });
  });

  describe('request status states', () => {
    it('returns isLoading false when request status is IDLE', () => {
      const store = createMockStore({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.IDLE,
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

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('returns isLoading false when request status is SUCCESS', () => {
      const store = createMockStore({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.SUCCESS,
            data: 'US-CA',
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('returns isLoading true when request status is LOADING', () => {
      const store = createMockStore({
        requests: {
          'updateUserRegion:[]': {
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

    it('returns error when request status is ERROR', () => {
      const store = createMockStore({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.ERROR,
            data: null,
            error: 'Failed to fetch geolocation',
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch geolocation');
    });
  });

  describe('fetchGeolocation return value', () => {
    it('returns the value from updateUserRegion', async () => {
      const store = createMockStore();
      const mockUpdateUserRegion = Engine.context.RampsController
        .updateUserRegion as jest.Mock;
      const expectedValue = 'US-NY';
      mockUpdateUserRegion.mockResolvedValue(expectedValue);

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(mockUpdateUserRegion).toHaveBeenCalled();
      });

      const returnedValue = await result.current.fetchGeolocation();

      expect(returnedValue).toBe(expectedValue);
    });

    it('returns different values on subsequent calls', async () => {
      const store = createMockStore();
      const mockUpdateUserRegion = Engine.context.RampsController
        .updateUserRegion as jest.Mock;
      mockUpdateUserRegion
        .mockResolvedValueOnce('US')
        .mockResolvedValueOnce('US-CA')
        .mockResolvedValueOnce('US-NY');

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(mockUpdateUserRegion).toHaveBeenCalled();
      });

      const firstValue = await result.current.fetchGeolocation();

      expect(firstValue).toBe('US-CA');

      const secondValue = await result.current.fetchGeolocation();

      expect(secondValue).toBe('US-NY');
    });
  });

  describe('hook reads from store state', () => {
    it('reads geolocation from store state', () => {
      const store = createMockStore({ userRegion: 'US-CA' });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.geolocation).toBe('US-CA');
    });

    it('reads different geolocation values from different store states', () => {
      const store1 = createMockStore({ userRegion: 'US-CA' });
      const { result: result1 } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store1),
      });
      expect(result1.current.geolocation).toBe('US-CA');

      const store2 = createMockStore({ userRegion: 'US-NY' });
      const { result: result2 } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store2),
      });
      expect(result2.current.geolocation).toBe('US-NY');
    });

    it('reads isLoading from different request states', () => {
      const store1 = createMockStore({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.IDLE,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const { result: result1 } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store1),
      });
      expect(result1.current.isLoading).toBe(false);

      const store2 = createMockStore({
        requests: {
          'updateUserRegion:[]': {
            status: RequestStatus.LOADING,
            data: null,
            error: null,
            timestamp: Date.now(),
            lastFetchedAt: Date.now(),
          },
        },
      });

      const { result: result2 } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store2),
      });
      expect(result2.current.isLoading).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns default loading and error state for empty requests object', () => {
      const store = createMockStore({
        requests: {},
      });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('returns null geolocation when userRegion is null', () => {
      const store = createMockStore({ userRegion: null });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.geolocation).toBe(null);
    });

    it('returns empty string geolocation when userRegion is empty string', () => {
      const store = createMockStore({ userRegion: '' });

      const { result } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      expect(result.current.geolocation).toBe('');
    });

    it('maintains fetchGeolocation function reference across renders', () => {
      const store = createMockStore();

      const { result, rerender } = renderHook(() => useRampsGeolocation(), {
        wrapper: wrapper(store),
      });

      const firstRenderFunction = result.current.fetchGeolocation;

      rerender(undefined);

      const secondRenderFunction = result.current.fetchGeolocation;

      expect(firstRenderFunction).toBe(secondRenderFunction);
    });
  });
});
