/* eslint-disable import/no-namespace */
/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import * as Actions from '../../../actions/notification/pushNotifications';
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
      .mockReturnValue(jest.fn());

    return {
      enableProfileSyncing,
    };
  }

  it('should enable profile syncing and return loading as false and error as undefined', async () => {
    const mockActions = arrangeActions();

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockActions.enableProfileSyncing).toHaveBeenCalled();
    expect(result.current.error).toBeUndefined();
  });

  it('should set error message when enableProfileSyncingAction returns an error', async () => {
    const mockActions = arrangeActions();
    mockActions.enableProfileSyncing.mockReturnValue(
      async () => 'MOCK - failed to enable profile syncing',
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockActions.enableProfileSyncing).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
  });

  it('should set error message when an error occurs during enableProfileSyncing', async () => {
    const mockActions = arrangeActions();
    mockActions.enableProfileSyncing.mockReturnValue(async () => {
      throw new Error('MOCK - failed to enable profile syncing');
    });

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.enableProfileSyncing();
    });

    expect(mockActions.enableProfileSyncing).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
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
      .mockReturnValue(jest.fn());

    return {
      disableProfileSyncing,
    };
  }

  it('should disable profile syncing and return loading as false and error as undefined', async () => {
    const mockActions = arrangeActions();

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockActions.disableProfileSyncing).toHaveBeenCalled();
    expect(result.current.error).toBeUndefined();
  });

  it('should set error message when disableProfileSyncingAction returns an error', async () => {
    const mockActions = arrangeActions();
    mockActions.disableProfileSyncing.mockReturnValue(
      async () => 'MOCK - failed to disable profile syncing',
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockActions.disableProfileSyncing).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
  });

  it('should set error message when an error occurs during disableProfileSyncing', async () => {
    const mockActions = arrangeActions();
    mockActions.disableProfileSyncing.mockReturnValue(async () => {
      throw new Error('MOCK - failed to disable profile syncing');
    });

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.disableProfileSyncing();
    });

    expect(mockActions.disableProfileSyncing).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
  });
});
