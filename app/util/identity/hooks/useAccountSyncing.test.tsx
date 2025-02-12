/* eslint-disable import/no-namespace */
/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import * as Actions from '../../../actions/identity';
import initialRootState from '../../../util/test/initial-root-state';
import { useAccountSyncing } from './useAccountSyncing';

function arrangeStore() {
  const store = createMockStore()(initialRootState);

  // Ensure dispatch mocks are handled correctly
  store.dispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    return Promise.resolve();
  });

  return store;
}

describe('useAccountSyncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useAccountSyncing(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  function arrangeActions() {
    const syncInternalAccountsWithUserStorageAction = jest
      .spyOn(Actions, 'syncInternalAccountsWithUserStorage')
      .mockResolvedValue(undefined);

    return {
      syncInternalAccountsWithUserStorageAction,
    };
  }

  it('dispatches account syncing and error as undefined', async () => {
    const mockActions = arrangeActions();

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.dispatchAccountSyncing();
    });

    expect(
      mockActions.syncInternalAccountsWithUserStorageAction,
    ).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeUndefined();
  });

  it('sets error message when syncInternalAccountsWithUserStorageAction returns an error', async () => {
    const mockActions = arrangeActions();
    mockActions.syncInternalAccountsWithUserStorageAction.mockRejectedValueOnce(
      new Error('MOCK - failed to sync internal account with user storage'),
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.dispatchAccountSyncing();
    });

    expect(
      mockActions.syncInternalAccountsWithUserStorageAction,
    ).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeDefined();
    expect(result.current.error).toEqual(
      'MOCK - failed to sync internal account with user storage',
    );
  });

  it('sets error message when an error occurs during dispatchAccountSyncing', async () => {
    const mockActions = arrangeActions();
    mockActions.syncInternalAccountsWithUserStorageAction.mockRejectedValueOnce(
      new Error('MOCK - failed to sync internal account with user storage'),
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.dispatchAccountSyncing();
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error).toEqual(
      'MOCK - failed to sync internal account with user storage',
    );
  });
});
