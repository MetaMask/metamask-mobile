import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useHydrateRampsController } from './useHydrateRampsController';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      hydrateState: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

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
    jest.clearAllMocks();
    mockUseRampsUnifiedV2Enabled.mockReturnValue(true);
  });

  it('calls hydrateState when V2 unified is enabled and userRegion has regionCode', () => {
    const store = createMockStore({ regionCode: 'us-ca' });
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    expect(Engine.context.RampsController.hydrateState).toHaveBeenCalledTimes(
      1,
    );
  });

  it('does not call hydrateState when userRegion is null', () => {
    const store = createMockStore(null);
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    expect(Engine.context.RampsController.hydrateState).not.toHaveBeenCalled();
  });

  it('does not call hydrateState when userRegion has no regionCode', () => {
    const store = createMockStore({});
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    expect(Engine.context.RampsController.hydrateState).not.toHaveBeenCalled();
  });

  it('calls hydrateState again when regionCode changes', () => {
    const store1 = createMockStore({ regionCode: 'us-ca' });
    const { unmount } = renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store1),
    });

    expect(Engine.context.RampsController.hydrateState).toHaveBeenCalledTimes(
      1,
    );

    unmount();

    const store2 = createMockStore({ regionCode: 'gb' });
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store2),
    });

    expect(Engine.context.RampsController.hydrateState).toHaveBeenCalledTimes(
      2,
    );
  });

  it('handles hydrateState rejection gracefully', async () => {
    (
      Engine.context.RampsController.hydrateState as jest.Mock
    ).mockRejectedValueOnce(new Error('Network error'));

    const store = createMockStore({ regionCode: 'us-ca' });
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    await Promise.resolve();

    expect(Engine.context.RampsController.hydrateState).toHaveBeenCalledTimes(
      1,
    );
  });

  it('does not call hydrateState when V2 unified is disabled', () => {
    mockUseRampsUnifiedV2Enabled.mockReturnValue(false);

    const store = createMockStore({ regionCode: 'us-ca' });
    renderHook(() => useHydrateRampsController(), {
      wrapper: wrapper(store),
    });

    expect(Engine.context.RampsController.hydrateState).not.toHaveBeenCalled();
  });
});
