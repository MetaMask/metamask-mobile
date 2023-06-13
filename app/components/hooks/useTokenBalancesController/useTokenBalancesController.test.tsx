import React from 'react';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react-native';
import lodash from 'lodash';
import useTokenBalancesController from './useTokenBalancesController';

interface TokenBalance {
  [address: string]: string;
}

const initialBalances: TokenBalance = {
  '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x2a',
};

// initial state for the mock store
// without contract balances
const mockState = {
  engine: {
    backgroundState: {
      TokenBalancesController: { contractBalances: initialBalances },
    },
  },
};

let mockStore: any;
let renderResult: any;
let spyOnIsEqual: any;

const Wrapper = ({ children }: any) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('useTokenBalancesController', () => {
  beforeEach(() => {
    mockState.engine.backgroundState.TokenBalancesController.contractBalances =
      initialBalances;
    mockStore = configureMockStore()(() => mockState);
    // spy on lodash isEqual function as this is the only way to check if the hook is correctly checking for equality
    spyOnIsEqual = jest.spyOn(lodash, 'isEqual');
    // render the hook with initial empty token balances
    renderResult = renderHook(() => useTokenBalancesController(), {
      wrapper: Wrapper,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    renderResult.unmount();
  });

  it('should use selector on redux store when state changed', async () => {
    const { result, rerender } = renderResult;

    // memo hook is called, equality check is performed
    // and returns false as it's the first time the hook is called and no state is stored in the memo
    expect(spyOnIsEqual).toHaveNthReturnedWith(1, false);
    // useSelector hook equality check returns true as the storage state haven't changed yet
    expect(spyOnIsEqual).toHaveNthReturnedWith(2, true);
    spyOnIsEqual.mockClear();

    // check that the initial balances are returned
    expect(result.current.data).toStrictEqual(initialBalances);

    // add a new token balance to the expected result
    const newBalance: TokenBalance = {
      '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b96': '0x539',
    };
    const expectedBalances: TokenBalance = {
      ...initialBalances,
      ...newBalance,
    };

    // add the new token balances in the state
    mockState.engine.backgroundState.TokenBalancesController.contractBalances =
      expectedBalances;

    // rerender the hook to get the new balances
    rerender({ wrapper: Wrapper });

    // memo hook equality check returns false as it changed from the previous state
    expect(spyOnIsEqual).toHaveNthReturnedWith(1, false);
    // useSelector hook equality check returns false as the storage state have been updated
    expect(spyOnIsEqual).toHaveNthReturnedWith(2, false);
    spyOnIsEqual.mockClear();

    expect(result.current.data).toEqual(expectedBalances);
  });

  it('should not use selector on redux store when state is unchanged', async () => {
    const { result, rerender } = renderResult;

    // memo hook is called, equality check is performed
    // and returns false as it's the first time the hook is called and no state is stored in the memo
    expect(spyOnIsEqual).toHaveNthReturnedWith(1, false);
    // useSelector hook equality check returns true as the storage state haven't changed yet
    expect(spyOnIsEqual).toHaveNthReturnedWith(2, true);
    spyOnIsEqual.mockClear();

    // check that the initial balances are returned
    expect(result.current.data).toStrictEqual(initialBalances);

    // update token balances with identical object but different reference
    mockState.engine.backgroundState.TokenBalancesController.contractBalances =
      lodash.cloneDeep(initialBalances);
    // rerender the hook to get the new balances
    rerender({ wrapper: Wrapper });
    // check that the same balances are returned
    expect(result.current.data).toStrictEqual(initialBalances);

    // memo hook equality check returns true as new state object content is similar to the previous one
    expect(spyOnIsEqual).toHaveNthReturnedWith(1, true);
    // useSelector hook equality check returns true as the storage state object content is similar to the previous one
    expect(spyOnIsEqual).toHaveNthReturnedWith(2, true);
    spyOnIsEqual.mockClear();
  });
});
