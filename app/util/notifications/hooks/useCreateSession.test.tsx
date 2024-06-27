/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable import/no-namespace */
/* eslint-disable @typescript-eslint/no-require-imports */
import { act, renderHook } from '@testing-library/react-hooks';
import initialRootState from '../../../util/test/initial-root-state';
import React from 'react';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import * as Selectors from '../../../selectors/pushNotifications';
import * as Actions from '../../../actions/notification/pushNotifications';
import useCreateSession from './useCreateSession';

describe('useCreateSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not initiate session creation if user is already signed in', async () => {
    const mockSelectors = arrangeSelectors();
    const mockActions = arrangeActions();
    mockSelectors.mockSelectIsSignedIn.mockReturnValueOnce(true);

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.createSession();
    });

    expect(mockActions.mockSignIn).not.toHaveBeenCalled();
    expect(mockActions.mockDisableProfileSyncing).not.toHaveBeenCalled();
  });

  it('should not initiate session creation if profile syncing is disabled', async () => {
    const mockSelectors = arrangeSelectors();
    const mockActions = arrangeActions();
    mockSelectors.mockSelectIsSignedIn.mockReturnValueOnce(true);
    mockSelectors.mockSelectIsProfileSyncingEnabled.mockReturnValueOnce(false);

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.createSession();
    });

    expect(mockActions.mockSignIn).not.toHaveBeenCalled();
    expect(mockActions.mockDisableProfileSyncing).not.toHaveBeenCalled();
  });

  it('should initiate session creation if profile syncing is enabled', async () => {
    const mockSelectors = arrangeSelectors();
    const mockActions = arrangeActions();

    // If a user is not signed in, but profile syncing is enabled, then we want to sign in.
    mockSelectors.mockSelectIsSignedIn.mockReturnValueOnce(false);
    mockSelectors.mockSelectIsProfileSyncingEnabled.mockReturnValueOnce(true);

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.createSession();
    });

    expect(mockActions.mockSignIn).toHaveBeenCalled();
  });

  it('should disable profile syncing and set error message if sign-in fails', async () => {
    const mockSelectors = arrangeSelectors();
    const mockActions = arrangeActions();

    // If a user is not signed in, but profile syncing is enabled, then we want to sign in.
    mockSelectors.mockSelectIsSignedIn.mockReturnValue(false);
    mockSelectors.mockSelectIsProfileSyncingEnabled.mockReturnValue(true);

    // However we want to simulate signing in failing
    mockActions.mockSignIn.mockReturnValueOnce(
      async () => 'MOCK - failed to sign in',
    );

    const { result } = arrangeHook();
    await act(async () => {
      await result.current.createSession();
    });

    expect(mockActions.mockSignIn).toHaveBeenCalled();
    expect(mockActions.mockDisableProfileSyncing).toHaveBeenCalled();
    expect(result.current.error).toBeDefined();
  });

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

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useCreateSession(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  function arrangeSelectors() {
    const mockSelectIsSignedIn = jest
      .spyOn(Selectors, 'selectIsSignedIn')
      .mockReturnValue(true);

    const mockSelectIsProfileSyncingEnabled = jest
      .spyOn(Selectors, 'selectIsProfileSyncingEnabled')
      .mockReturnValue(true);

    return {
      mockSelectIsSignedIn,
      mockSelectIsProfileSyncingEnabled,
    };
  }

  function arrangeActions() {
    const mockSignIn = jest.spyOn(Actions, 'signIn').mockReturnValue(jest.fn());
    const mockDisableProfileSyncing = jest
      .spyOn(Actions, 'disableProfileSyncing')
      .mockReturnValue(jest.fn());

    return {
      mockSignIn,
      mockDisableProfileSyncing,
    };
  }
});
