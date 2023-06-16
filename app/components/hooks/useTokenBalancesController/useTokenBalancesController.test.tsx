import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { act, render, waitFor } from '@testing-library/react-native';
import useTokenBalancesController from './useTokenBalancesController';

interface TokenBalance {
  [address: string]: string;
}

const initialBalances: TokenBalance = {
  '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x2a',
};

// initial state for the test store
const testState = {
  engine: {
    backgroundState: {
      TokenBalancesController: { contractBalances: initialBalances },
    },
  },
};

// test reducer for the test store
const testBalancesReducer = (state: any, action: any) => {
  if (action.type === 'add-balances') {
    const newBalances = {
      ...state.engine.backgroundState.TokenBalancesController.contractBalances,
      ...action.value,
    };
    state.engine.backgroundState.TokenBalancesController.contractBalances =
      newBalances;
    return {
      ...state,
      value: newBalances,
    };
  }
  return testState;
};

const testStore = createStore(testBalancesReducer);

const Wrapper = ({ children }: any) => (
  <Provider store={testStore}>{children}</Provider>
);

const spyOnDummyUseEffect = jest.fn();
// Dummy component to test the useTokenBalancesController hook
// and be able to detect the rerenders using the useEffect spy
const DummyTestComponent = () => {
  const balances = useTokenBalancesController();

  useEffect(() => {
    spyOnDummyUseEffect();
  }, [balances]);

  return <Text>{JSON.stringify(balances)}</Text>;
};

describe('useTokenBalancesController()', () => {
  it('should only rerender when state changed', async () => {
    // render the component with the test store
    const { toJSON } = render(<DummyTestComponent />, { wrapper: Wrapper });

    // check the useEffect is called once and initial balances are returned
    await waitFor(async () => {
      // check that the initial balances are returned
      expect(spyOnDummyUseEffect).toHaveBeenCalledTimes(1);
      expect(toJSON()).toMatchSnapshot();
    });

    // add a new balance to the store
    await act(async () => {
      testStore.dispatch({
        type: 'add-balances',
        value: { '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b96': '0x539' },
      });
    });

    // check that the useEffect is called again and the new updated balances are returned
    await waitFor(() => {
      expect(spyOnDummyUseEffect).toHaveBeenCalledTimes(2);
      expect(toJSON()).toMatchSnapshot();
    });

    // add the same balance to the store again, should override the previous one
    await act(async () => {
      testStore.dispatch({
        type: 'add-balances',
        value: { '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b96': '0x539' },
      });
    });

    // check that the useEffect is not called again and the returned balances are unchanged
    await waitFor(async () => {
      expect(spyOnDummyUseEffect).toHaveBeenCalledTimes(2);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
