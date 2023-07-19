import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { Provider } from 'react-redux';
import { createStore, Store } from 'redux';
import { act, render, waitFor } from '@testing-library/react-native';
import useTokenBalancesController from './useTokenBalancesController';
import { BN } from 'ethereumjs-util';
import { cloneDeep } from 'lodash';

// initial state for the test store
const initialState = {
  engine: {
    backgroundState: {
      TokenBalancesController: {
        contractBalances: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': new BN(0x2a),
        },
      },
    },
  },
};

// test reducer for the test store
const testBalancesReducer = (state: any, action: any) => {
  if (action.type === 'add-balances') {
    return {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...state.engine.backgroundState,
          TokenBalancesController: {
            ...state.engine.backgroundState.TokenBalancesController,
            contractBalances: {
              ...state.engine.backgroundState.TokenBalancesController
                .contractBalances,
              ...action.value,
            },
          },
        },
      },
    };
  }
  return state;
};

const spyOnDummyUseEffect = jest.fn();
// Dummy component to test the useTokenBalancesController hook
// and be able to detect the rerenders using the useEffect spy
const DummyTestComponent = () => {
  const balances = useTokenBalancesController();

  useEffect(() => {
    spyOnDummyUseEffect();
  }, [balances]);

  // render the balances as a string to be able to compare the snapshots
  return <Text>{JSON.stringify(balances)}</Text>;
};

describe('useTokenBalancesController()', () => {
  let toJSON: any;
  let testStore: Store<any, any>;

  beforeEach(async () => {
    // create a test store, not a mock, as we need to test for content changes
    // Cloning as the store is mutated by the reducer and prevents the test from
    // starting from fresh store with the initial state
    testStore = createStore(testBalancesReducer, cloneDeep(initialState));

    // console.log('testStore', JSON.stringify(testStore.getState()));

    const Wrapper = ({ children }: any) => (
      <Provider store={testStore}>{children}</Provider>
    );

    // render the component with the test store
    toJSON = render(<DummyTestComponent />, { wrapper: Wrapper }).toJSON;

    await waitFor(async () => {
      // check that the initial balances are returned
      expect(spyOnDummyUseEffect).toHaveBeenCalledTimes(1);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should rerender when state changed', async () => {
    // add a new balance to the store
    act(() => {
      testStore.dispatch({
        type: 'add-balances',
        value: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b96': new BN(0x539),
        },
      });
    });

    // check that the useEffect is called again and the new updated balances are returned
    await waitFor(() => {
      expect(spyOnDummyUseEffect).toHaveBeenCalledTimes(2);
      expect(toJSON()).toMatchSnapshot();
    });
  });

  it('should not rerender when state is not changed', async () => {
    // add the same balance to the store again, should override the previous one
    act(() => {
      testStore.dispatch({
        type: 'add-balances',
        value: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': new BN(0x2a),
        },
      });
    });

    // check that the useEffect is not called again and the returned balances are unchanged
    await waitFor(async () => {
      expect(spyOnDummyUseEffect).toHaveBeenCalledTimes(1);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
