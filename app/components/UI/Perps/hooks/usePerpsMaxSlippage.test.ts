import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { AnyAction } from 'redux';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import { usePerpsMaxSlippage } from './usePerpsMaxSlippage';
import Engine from '../../../../core/Engine';
import { PERPS_SLIPPAGE_DEFAULT_BPS } from '../constants/slippageConfig';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setMaxSlippage: jest.fn(),
    },
  },
}));

const mockController = Engine.context.PerpsController as unknown as {
  setMaxSlippage: jest.Mock;
};

const SET_MAX_SLIPPAGE = 'test/setMaxSlippage';

interface TestPerpsControllerState {
  maxSlippageBps?: number;
}

interface TestEngineState {
  backgroundState: {
    PerpsController: TestPerpsControllerState;
  };
}

const createSlippageStore = (maxSlippageBps?: number) =>
  configureStore({
    reducer: {
      engine: (
        state: TestEngineState | undefined,
        action: AnyAction,
      ): TestEngineState => {
        const currentState = state ?? {
          backgroundState: {
            PerpsController:
              maxSlippageBps === undefined ? {} : { maxSlippageBps },
          },
        };

        if (
          action.type !== SET_MAX_SLIPPAGE ||
          typeof action.payload !== 'number'
        ) {
          return currentState;
        }

        return {
          ...currentState,
          backgroundState: {
            ...currentState.backgroundState,
            PerpsController: { maxSlippageBps: action.payload },
          },
        };
      },
    },
  });

type SlippageStore = ReturnType<typeof createSlippageStore>;

const createWrapper = (store: SlippageStore) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      Provider,
      { store } as React.ComponentProps<typeof Provider>,
      children,
    );
  };

describe('usePerpsMaxSlippage', () => {
  beforeEach(() => {
    mockController.setMaxSlippage.mockReset();
  });

  it('returns the controller value with the user-configured source', () => {
    const store = createSlippageStore(500);
    const { result } = renderHook(() => usePerpsMaxSlippage(), {
      wrapper: createWrapper(store),
    });
    expect(result.current.maxSlippageBps).toBe(500);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED,
    );
  });

  it('falls back to the controller default source when unset', () => {
    const store = createSlippageStore();
    const { result } = renderHook(() => usePerpsMaxSlippage(), {
      wrapper: createWrapper(store),
    });
    expect(result.current.maxSlippageBps).toBe(PERPS_SLIPPAGE_DEFAULT_BPS);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT,
    );
  });

  it('persists a new value and refreshes the read', () => {
    const store = createSlippageStore();
    mockController.setMaxSlippage.mockImplementation((bps: number) => {
      store.dispatch({ type: SET_MAX_SLIPPAGE, payload: bps });
    });
    const { result } = renderHook(() => usePerpsMaxSlippage(), {
      wrapper: createWrapper(store),
    });

    expect(result.current.maxSlippageBps).toBe(PERPS_SLIPPAGE_DEFAULT_BPS);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.DEFAULT,
    );

    act(() => {
      result.current.setMaxSlippage(450);
    });

    expect(mockController.setMaxSlippage).toHaveBeenCalledWith(450);
    expect(result.current.maxSlippageBps).toBe(450);
    expect(result.current.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED,
    );
  });

  it('updates every hook instance after a shared controller state save', () => {
    const store = createSlippageStore();
    mockController.setMaxSlippage.mockImplementation((bps: number) => {
      store.dispatch({ type: SET_MAX_SLIPPAGE, payload: bps });
    });
    const { result } = renderHook(
      () => ({
        first: usePerpsMaxSlippage(),
        second: usePerpsMaxSlippage(),
      }),
      { wrapper: createWrapper(store) },
    );

    expect(result.current.first.maxSlippageBps).toBe(
      PERPS_SLIPPAGE_DEFAULT_BPS,
    );
    expect(result.current.second.maxSlippageBps).toBe(
      PERPS_SLIPPAGE_DEFAULT_BPS,
    );

    act(() => {
      result.current.first.setMaxSlippage(1000);
    });

    expect(result.current.first.maxSlippageBps).toBe(1000);
    expect(result.current.second.maxSlippageBps).toBe(1000);
    expect(result.current.first.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED,
    );
    expect(result.current.second.maxSlippageSource).toBe(
      PERPS_EVENT_VALUE.MAX_SLIPPAGE_SOURCE.USER_CONFIGURED,
    );
  });
});
