import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsUserRegion } from './useRampsUserRegion';
import { RequestStatus } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      updateUserRegion: jest.fn().mockResolvedValue('US'),
      setUserRegion: jest.fn().mockResolvedValue({
        aggregator: true,
        deposit: true,
        global: true,
      }),
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

describe('useRampsUserRegion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('return value structure', () => {
    it('returns userRegion, isLoading, error, fetchUserRegion, and setUserRegion', () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      expect(result.current).toMatchObject({
        userRegion: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchUserRegion).toBe('function');
      expect(typeof result.current.setUserRegion).toBe('function');
    });
  });

  describe('userRegion state', () => {
    it('returns userRegion from state', () => {
      const store = createMockStore({ userRegion: 'US-CA' });
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      expect(result.current.userRegion).toBe('US-CA');
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
      const { result } = renderHook(() => useRampsUserRegion(), {
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
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchUserRegion', () => {
    it('calls updateUserRegion without options when called with no arguments', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchUserRegion();
      expect(
        Engine.context.RampsController.updateUserRegion,
      ).toHaveBeenCalledWith(undefined);
    });

    it('calls updateUserRegion with forceRefresh true when specified', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchUserRegion({ forceRefresh: true });
      expect(
        Engine.context.RampsController.updateUserRegion,
      ).toHaveBeenCalledWith({
        forceRefresh: true,
      });
    });

    it('calls updateUserRegion with forceRefresh false when specified', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.fetchUserRegion({ forceRefresh: false });
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

      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });

      await expect(result.current.fetchUserRegion()).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('setUserRegion', () => {
    it('calls setUserRegion on controller', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.setUserRegion('US-CA');
      expect(Engine.context.RampsController.setUserRegion).toHaveBeenCalledWith(
        'US-CA',
        undefined,
      );
    });

    it('calls setUserRegion with options when specified', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });
      await result.current.setUserRegion('US-CA', { forceRefresh: true });
      expect(Engine.context.RampsController.setUserRegion).toHaveBeenCalledWith(
        'US-CA',
        { forceRefresh: true },
      );
    });
  });

  describe('useEffect error handling', () => {
    it('returns default state when fetchUserRegion rejects in useEffect', async () => {
      const store = createMockStore();
      const mockUpdateUserRegion = Engine.context.RampsController
        .updateUserRegion as jest.Mock;
      mockUpdateUserRegion.mockReset();
      mockUpdateUserRegion.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useRampsUserRegion(), {
        wrapper: wrapper(store),
      });

      await waitFor(() => {
        expect(mockUpdateUserRegion).toHaveBeenCalled();
      });

      expect(result.current).toMatchObject({
        userRegion: null,
        isLoading: false,
        error: null,
      });
      expect(typeof result.current.fetchUserRegion).toBe('function');
    });
  });
});
