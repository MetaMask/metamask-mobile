/* eslint-disable import/no-namespace */
/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import * as Actions from '../../../actions/notification/helpers';
import initialRootState from '../../../util/test/initial-root-state';
import { useProfileSyncing } from './useProfileSyncing';

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

describe('useEnableProfileSyncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useProfileSyncing(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  function arrangeActions() {
    const enableProfileSyncing = jest
      .spyOn(Actions, 'enableProfileSyncing')
      .mockResolvedValue(undefined);

    return {
      enableProfileSyncing,
    };
  }

  it('enables profile syncing and return loading as false and error as undefined', async () => {
    const mockActions = arrangeActions();

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockActions.enableProfileSyncing).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeUndefined();
  });

  it('sets error message when enableProfileSyncingAction returns an error', async () => {
    const mockActions = arrangeActions();
    mockActions.enableProfileSyncing.mockRejectedValueOnce(
      new Error('MOCK - failed to enable profile syncing'),
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockActions.enableProfileSyncing).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeDefined();
    expect(result.current.error).toEqual(
      'MOCK - failed to enable profile syncing',
    );
  });

  it('sets error message when an error occurs during enableProfileSyncing', async () => {
    const mockActions = arrangeActions();
    mockActions.enableProfileSyncing.mockRejectedValueOnce(
      new Error('MOCK - failed to enable profile syncing'),
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockActions.enableProfileSyncing).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeDefined();
    expect(result.current.error).toEqual(
      'MOCK - failed to enable profile syncing',
    );
  });
});

describe('useDisableProfileSyncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useProfileSyncing(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  function arrangeActions() {
    const disableProfileSyncing = jest
      .spyOn(Actions, 'disableProfileSyncing')
      .mockResolvedValue(undefined);

    return {
      disableProfileSyncing,
    };
  }

  it('disables profile syncing and return loading as false and error as undefined', async () => {
    const mockActions = arrangeActions();

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockActions.disableProfileSyncing).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeUndefined();
  });

  it('sets error message when disableProfileSyncingAction returns an error', async () => {
    const mockActions = arrangeActions();
    mockActions.disableProfileSyncing.mockRejectedValueOnce(
      new Error('MOCK - failed to disable profile syncing'),
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockActions.disableProfileSyncing).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeDefined();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(
      'MOCK - failed to disable profile syncing',
    );
  });

  it('sets error message when an error occurs during disableProfileSyncing', async () => {
    const mockActions = arrangeActions();
    mockActions.disableProfileSyncing.mockRejectedValueOnce(
      new Error('MOCK - failed to disable profile syncing'),
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockActions.disableProfileSyncing).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeDefined();
    expect(result.current.error).toEqual(
      'MOCK - failed to disable profile syncing',
    );
  });
});
