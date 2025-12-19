import { renderHook, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsGeolocation } from './useRampsGeolocation';
import { RequestStatus } from '@metamask/ramps-controller';
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

describe('useRampsGeolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null geolocation when not yet fetched', () => {
    const store = createMockStore();
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.geolocation).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('returns geolocation from request cache when available', () => {
    const cacheKey = 'updateGeolocation:[]';
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
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.geolocation).toBe('US-CA');
    expect(result.current.isLoading).toBe(false);
  });

  it('returns null when request data is not yet loaded', () => {
    const store = createMockStore({
      requests: {},
    });
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.geolocation).toBeNull();
  });

  it('returns loading state when request is in progress', () => {
    const cacheKey = 'updateGeolocation:[]';
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
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error when request failed', () => {
    const cacheKey = 'updateGeolocation:[]';
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
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.error).toBe('Failed to fetch geolocation');
  });

  it('fetches geolocation on mount by default', async () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
    };

    renderHook(() => useRampsGeolocation(), { wrapper: wrapper(store) });

    await waitFor(() => {
      expect(mockUpdateGeolocation).toHaveBeenCalled();
    });
  });

  it('does not fetch on mount when onMount is false', () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
    };

    renderHook(() => useRampsGeolocation({ onMount: false }), {
      wrapper: wrapper(store),
    });

    expect(mockUpdateGeolocation).not.toHaveBeenCalled();
  });
});
