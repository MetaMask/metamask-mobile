import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useHydrateRampsController } from './useHydrateRampsController';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => {
  const mockInit = jest.fn().mockResolvedValue(undefined);
  const mockStartOrderPolling = jest.fn();
  return {
    context: {
      RampsController: {
        state: { userRegion: null },
        init: mockInit,
        startOrderPolling: mockStartOrderPolling,
      },
    },
  };
});

const mockUseRampsUnifiedV2Enabled = jest.fn();
jest.mock('./useRampsUnifiedV2Enabled', () => ({
  __esModule: true,
  default: () => mockUseRampsUnifiedV2Enabled(),
}));

const createMockStore = (userRegion: { regionCode?: string } | null = null) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          RampsController: {
            userRegion,
          },
        },
      }),
    },
  });

const wrapper = (store: ReturnType<typeof createMockStore>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store } as never, children);
  };

describe('useHydrateRampsController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
    (
      Engine.context.RampsController as { state: { userRegion: unknown } }
    ).state = { userRegion: null };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call init when userRegion has regionCode', () => {
    const store = createMockStore({ regionCode: 'us-ca' });
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    jest.advanceTimersByTime(6000);
    expect(Engine.context.RampsController.init).not.toHaveBeenCalled();
  });

  it('does not call init when userRegion has no regionCode but V2 disabled', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);
    const store = createMockStore(null);
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    jest.advanceTimersByTime(6000);
    expect(Engine.context.RampsController.init).not.toHaveBeenCalled();
  });

  it('calls init after backup delay when userRegion is null', () => {
    const store = createMockStore(null);
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    expect(Engine.context.RampsController.init).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);
    expect(Engine.context.RampsController.init).toHaveBeenCalledTimes(1);
  });

  it('calls startOrderPolling when backup init resolves', async () => {
    const store = createMockStore(null);
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(
      Engine.context.RampsController.startOrderPolling,
    ).toHaveBeenCalledTimes(1);
  });

  it('skips init when userRegion is set on controller before timeout fires', () => {
    const store = createMockStore(null);
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    (
      Engine.context.RampsController as { state: { userRegion: unknown } }
    ).state = { userRegion: { regionCode: 'us-ca' } };
    jest.advanceTimersByTime(5000);
    expect(Engine.context.RampsController.init).not.toHaveBeenCalled();
  });
});
