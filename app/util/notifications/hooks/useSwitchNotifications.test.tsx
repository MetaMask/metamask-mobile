/* eslint-disable react/prop-types */
/* eslint-disable react/display-name */
/* eslint-disable import/no-namespace */
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { act, renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { Provider } from 'react-redux';
import { useSwitchNotifications } from './useSwitchNotifications';
import { Store } from 'redux';
import * as Actions from '../../../actions/notification/pushNotifications';
import initialRootState from '../../test/initial-root-state';

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

describe('useSwitchNotifications', () => {
  let store: Store;

  beforeEach(() => {
    store = mockStore(initialRootState);

    // Ensure dispatch mocks are handled correctly
    store.dispatch = jest.fn().mockImplementation((action) => {
      if (typeof action === 'function') {
        return action(store.dispatch, store.getState);
      }
      return Promise.resolve();
    });

    jest.clearAllMocks();
  });

  const arrangeHook = () => {
    const hook = renderHook(() => useSwitchNotifications(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  };

  test('should switch snap notifications', async () => {
    const mockSetSnapNotificationEnabled = jest
      .spyOn(Actions, 'setSnapNotificationsEnabled')
      .mockImplementation(jest.fn());

    const { result } = arrangeHook();
    const { switchSnapNotifications } = result.current;

    await act(async () => {
      await switchSnapNotifications(true);
    });

    expect(mockSetSnapNotificationEnabled).toHaveBeenCalledWith(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should switch feature announcements', async () => {
    const mockSetFeatureAnnouncementEnabled = jest
      .spyOn(Actions, 'setFeatureAnnouncementsEnabled')
      .mockImplementation(jest.fn());

    const { result } = arrangeHook();
    const { switchFeatureAnnouncements } = result.current;

    await act(async () => {
      await switchFeatureAnnouncements(true);
    });

    expect(mockSetFeatureAnnouncementEnabled).toHaveBeenCalledWith(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should switch account notifications', async () => {
    const mockUpdateOnChainTriggersByAccount = jest
      .spyOn(Actions, 'updateOnChainTriggersByAccount')
      .mockImplementation(jest.fn());
    const mockDeleteOnChainTriggersByAccount = jest
      .spyOn(Actions, 'deleteOnChainTriggersByAccount')
      .mockImplementation(jest.fn());

    const { result } = arrangeHook();
    const { switchAccountNotifications } = result.current;

    const accounts = ['account1', 'account2'];
    const state = true;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(mockUpdateOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(mockDeleteOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should delete account notifications', async () => {
    const mockUpdateOnChainTriggersByAccount = jest
      .spyOn(Actions, 'updateOnChainTriggersByAccount')
      .mockImplementation(jest.fn());
    const mockDeleteOnChainTriggersByAccount = jest
      .spyOn(Actions, 'deleteOnChainTriggersByAccount')
      .mockImplementation(jest.fn());

    const { result } = arrangeHook();
    const { switchAccountNotifications } = result.current;

    const accounts = ['account1', 'account2'];
    const state = false;

    await act(async () => {
      await switchAccountNotifications(accounts, state);
    });

    expect(mockDeleteOnChainTriggersByAccount).toHaveBeenCalledWith(accounts);
    expect(mockUpdateOnChainTriggersByAccount).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
