/* eslint-disable import/no-namespace */

import {  renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import createMockStore from 'redux-mock-store';
import React from 'react';
import * as NotificationUtils from '../../../util/notifications';
import FCMService from '../services/FCMService';
import useNotificationHandler from './index';
import initialRootState from '../../../util/test/initial-root-state';
import * as Selectors from '../../../selectors/notifications';
import { NavigationContainerRef } from '@react-navigation/native';

jest.mock('../../../util/notifications', () => ({
  isNotificationsFeatureEnabled: jest.fn(),
}));

jest.mock('../services/FCMService', () => ({
  registerAppWithFCM: jest.fn(),
  saveFCMToken: jest.fn(),
  registerTokenRefreshListener: jest.fn(),
  listenForMessagesForeground: jest.fn(),
}));

function arrangeMocks(isFeatureEnabled: boolean, isMetaMaskEnabled: boolean) {
  jest.spyOn(NotificationUtils, 'isNotificationsFeatureEnabled')
    .mockReturnValue(isFeatureEnabled);

  jest.spyOn(Selectors, 'selectIsMetamaskNotificationsEnabled')
    .mockReturnValue(isMetaMaskEnabled);
}

function arrangeStore() {
  const store = createMockStore()(initialRootState);

  store.dispatch = jest.fn().mockImplementation((action) => {
    if (typeof action === 'function') {
      return action(store.dispatch, store.getState);
    }
    return Promise.resolve();
  });

  return store;
}

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as NavigationContainerRef;

function arrangeHook() {
  const store = arrangeStore();
  const hook = renderHook(() => useNotificationHandler(mockNavigation), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });

  return hook;
}

describe('useNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not register FCM when notifications are disabled', () => {
    arrangeMocks(false, false);

    arrangeHook();

    expect(FCMService.registerAppWithFCM).not.toHaveBeenCalled();
    expect(FCMService.saveFCMToken).not.toHaveBeenCalled();
    expect(FCMService.listenForMessagesForeground).not.toHaveBeenCalled();
  });

  it('registers FCM when notifications feature is enabled', () => {
    arrangeMocks(true, true);

    arrangeHook();

    expect(FCMService.registerAppWithFCM).toHaveBeenCalledTimes(1);
    expect(FCMService.saveFCMToken).toHaveBeenCalledTimes(1);
  });

  it('registers FCM when MetaMask notifications are enabled', () => {
    arrangeMocks(true, true);

    arrangeHook();

    expect(FCMService.registerAppWithFCM).toHaveBeenCalledTimes(1);
    expect(FCMService.saveFCMToken).toHaveBeenCalledTimes(1);
  });

  it('handleNotificationCallback does nothing when notification is undefined', () => {
    arrangeMocks(true, true);

    arrangeHook();

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
