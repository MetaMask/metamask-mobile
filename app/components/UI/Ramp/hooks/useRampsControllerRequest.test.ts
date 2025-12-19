import { renderHook, waitFor } from '@testing-library/react-native';
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

  it('returns idle status when no request has been made', () => {
    const store = createMockStore();
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: jest.fn().mockReturnValue(false),
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.data).toBeNull();
  });

  it('returns loading status from redux when request is in progress', () => {
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
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.status).toBe('loading');
  });

  it('returns success status and data from redux when request completed', () => {
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
      () =>
        useRampsControllerRequest<string>('updateGeolocation', [], {
          onMount: false,
        }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe('US-CA');
  });

  it('returns error status and message from redux when request failed', () => {
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
    };

    const { result } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Network error');
  });

  it('executes request on mount when onMount is true', async () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
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

  it('does not execute request on mount when onMount is false', () => {
    const store = createMockStore();
    const mockUpdateGeolocation = jest.fn().mockResolvedValue('US');
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: mockUpdateGeolocation,
      abortRequest: jest.fn().mockReturnValue(false),
    };

    renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    expect(mockUpdateGeolocation).not.toHaveBeenCalled();
  });

  it('aborts request on unmount', async () => {
    const store = createMockStore();
    const mockAbortRequest = jest.fn().mockReturnValue(true);
    (Engine.context as { RampsController: unknown }).RampsController = {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
      abortRequest: mockAbortRequest,
    };

    const { unmount } = renderHook(
      () =>
        useRampsControllerRequest('updateGeolocation', [], { onMount: false }),
      { wrapper: wrapper(store) },
    );

    unmount();

    expect(mockAbortRequest).toHaveBeenCalledWith('updateGeolocation:[]');
  });
});
