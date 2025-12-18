import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useRampsControllerRequest } from './useRampsControllerRequest';
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

describe('useRampsControllerRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns idle state when no request has been made', () => {
    const store = createMockStore();
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.isIdle).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('returns loading state from redux when request is in progress', () => {
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
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isIdle).toBe(false);
  });

  it('returns success state from redux when request completed', () => {
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
      () =>
        useRampsControllerRequest<string>('updateGeolocation', [], {
          onMount: false,
        }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toBe('US-CA');
  });

  it('returns error state from redux when request failed', () => {
    const cacheKey = 'updateGeolocation:[]';
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
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe('Network error');
  });

  it('executes the request when calling execute()', async () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US-NY');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest<string>('updateGeolocation', [], {
          onMount: false,
        }),
      { wrapper: wrapper(store) },
    );

    let returnValue: string | undefined;
    await act(async () => {
      returnValue = await result.current.execute();
    });

    expect(mockUpdateGeolocation).toHaveBeenCalled();
    expect(returnValue).toBe('US-NY');
  });

  it('calls abortRequest on the controller when abort is called', () => {
    const store = createMockStore();
    const mockAbortRequest = jest.fn().mockReturnValue(true);
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: mockAbortRequest,
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    const didAbort = result.current.abort();

    expect(mockAbortRequest).toHaveBeenCalledWith('updateGeolocation:[]');
    expect(didAbort).toBe(true);
  });

  it('calls invalidateRequest on the controller when invalidate is called', () => {
    const store = createMockStore();
    const mockInvalidateRequest = jest.fn();
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: mockInvalidateRequest,
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    result.current.invalidate();

    expect(mockInvalidateRequest).toHaveBeenCalledWith('updateGeolocation:[]');
  });

  it('executes request on mount when onMount is true', async () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: true }),
      { wrapper: wrapper(store) },
    );

    await waitFor(() => {
      expect(mockUpdateGeolocation).toHaveBeenCalled();
    });
  });

  it('provides the correct cache key', () => {
    const store = createMockStore();
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
      invalidateRequest: jest.fn(),
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.cacheKey).toBe('updateGeolocation:[]');
  });

  it('throws an error if RampsController is not available', async () => {
    const store = createMockStore();
    (Engine.context as { RampsController: unknown }).RampsController = null;

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    await expect(result.current.execute()).rejects.toThrow(
      'RampsController is not available',
    );
  });
});
