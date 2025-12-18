import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import {
  useRampsGeolocation,
  useUpdateGeolocation,
} from './useRampsGeolocation';
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
    return React.createElement(Provider, { store }, children);
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
      invalidateRequest: jest.fn(),
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
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.geolocation).toBe('US-CA');
    expect(result.current.isSuccess).toBe(true);
  });

  it('falls back to legacy geolocation field when request data is null', () => {
    const store = createMockStore({
      geolocation: 'US-NY',
      requests: {},
    });
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.geolocation).toBe('US-NY');
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
      invalidateRequest: jest.fn(),
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
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe('Failed to fetch geolocation');
  });

  it('refreshes geolocation when refresh is called', async () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US-TX');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    let returnValue: string | undefined;
    await act(async () => {
      returnValue = await result.current.refresh();
    });

    expect(mockUpdateGeolocation).toHaveBeenCalled();
    expect(returnValue).toBe('US-TX');
  });

  it('can force refresh', async () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US-FL');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () => useRampsGeolocation({ onMount: false }),
      { wrapper: wrapper(store) },
    );

    await act(async () => {
      await result.current.refresh({ forceRefresh: true });
    });

    expect(mockUpdateGeolocation).toHaveBeenCalledWith({ forceRefresh: true });
  });

  it('fetches geolocation on mount by default', async () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    renderHook(() => useRampsGeolocation(), { wrapper: wrapper(store) });

    await waitFor(() => {
      expect(mockUpdateGeolocation).toHaveBeenCalled();
    });
  });
});

describe('useUpdateGeolocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a function to update geolocation', async () => {
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US-WA');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
    };

    const { result } = renderHook(() => useUpdateGeolocation());

    let returnValue: string | undefined;
    await act(async () => {
      returnValue = await result.current();
    });

    expect(mockUpdateGeolocation).toHaveBeenCalled();
    expect(returnValue).toBe('US-WA');
  });

  it('passes options to updateGeolocation', async () => {
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US-OR');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
    };

    const { result } = renderHook(() => useUpdateGeolocation());

    await act(async () => {
      await result.current({ forceRefresh: true, ttl: 5000 });
    });

    expect(mockUpdateGeolocation).toHaveBeenCalledWith({
      forceRefresh: true,
      ttl: 5000,
    });
  });

  it('throws error when RampsController is not available', async () => {
    (Engine.context as { RampsController: unknown }).RampsController = null;

    const { result } = renderHook(() => useUpdateGeolocation());

    await expect(result.current()).rejects.toThrow(
      'RampsController is not available',
    );
  });
});
