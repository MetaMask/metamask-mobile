import React from 'react';
import configureMockStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import {renderHook, waitFor} from '@testing-library/react-native';
import useTokenBalancesController from './useTokenBalancesController';

const mockStore = configureMockStore();

// initial state for the mock store
// without contract balances
let state = {
  settings: {},
  engine: {
    backgroundState: {
      TokenBalancesController: {contractBalances: {}},
    },
  },
};

const store = mockStore(() => state);

const Wrapper = ({children}: any) => (
  <Provider store={store}>{children}</Provider>
);

describe('useTokenBalancesController', () => {

  it('should return balances from useTokenBalancesController', async () => {

    // render the hook with initial empti token balances
    let result = renderHook(
      () => useTokenBalancesController(),
      {
        wrapper: Wrapper,
      },
    );

    // verify that the hook is loading
    expect(result.result.current.loading).toBeTruthy();
    expect(result.result.current.error).toBeUndefined();
    expect(result.result.current.data).toStrictEqual({});

    const expectedBalances = {
      '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
      '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b96': '0x6',
    };
    // Set the token balances in the state
    state.engine.backgroundState.TokenBalancesController.contractBalances = expectedBalances;

    // rerender the hook to get the new balances
    result.rerender( {wrapper: Wrapper});

    // verify that the hook is no longer loading and that the balances are correct
    await waitFor(() => {
      expect(result.result.current.loading).toBeFalsy();
      expect(result.result.current.data).toEqual(expectedBalances);
      expect(result.result.current.error).toBeUndefined();
    });

    // TODO verify that a new set of data with a different ref but identical content does not rerender
  });
});
