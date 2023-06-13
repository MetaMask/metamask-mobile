import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react-native';
import useTokenBalancesController from './useTokenBalancesController';

const mockStore = configureMockStore();

// initial state for the mock store
// without contract balances
const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      TokenBalancesController: { contractBalances: {} },
    },
  },
};

const store = mockStore(() => initialState);

const Wrapper = ({ children }: any) => (
  <Provider store={store}>{children}</Provider>
);

describe('useTokenBalancesController', () => {
  it('should return balances from useTokenBalancesController', async () => {
    // QUESTION: how to test that the hook is rerendered when the state changes without using the mockRenderWitness?
    const mockRenderWitness = jest.fn();

    // render the hook with initial empti token balances
    const { result, rerender } = renderHook(
      () => useTokenBalancesController(mockRenderWitness),
      {
        wrapper: Wrapper,
      },
    );

    // QUESTION: how to test that the hook is rerendered when the state changes without using the mockRenderWitness?
    expect(mockRenderWitness).toHaveBeenCalledTimes(1);
    mockRenderWitness.mockClear();

    expect(result.current.data).toStrictEqual({});

    const expectedBalances = {
      '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
      '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b96': '0x6',
    };
    // Set the token balances in the state
    initialState.engine.backgroundState.TokenBalancesController.contractBalances =
      expectedBalances;

    // rerender the hook to get the new balances
    rerender({ wrapper: Wrapper });

    // QUESTION: how to test that the hook is rerendered when the state changes without using the mockRenderWitness?
    expect(mockRenderWitness).toHaveBeenCalledTimes(1);
    mockRenderWitness.mockClear();

    expect(result.current.data).toEqual(expectedBalances);

    // verify that a new set of data with a different ref but identical content does not rerender
    const expectedIdenticalBalances = {
      '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
      '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b96': '0x6',
    };
    initialState.engine.backgroundState.TokenBalancesController.contractBalances =
      expectedIdenticalBalances;
    // rerender the hook to get the new balances
    rerender({ wrapper: Wrapper });

    // QUESTION: how to test that the hook is rerendered when the state changes without using the mockRenderWitness?
    expect(mockRenderWitness).not.toHaveBeenCalled();
  });
});
