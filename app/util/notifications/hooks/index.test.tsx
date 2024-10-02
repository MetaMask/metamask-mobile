import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import createMockStore from 'redux-mock-store';
import { EventType } from '@notifee/react-native';
import { Provider } from 'react-redux';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NotificationsService from '../services/NotificationService';
import Routes from '../../../constants/navigation/Routes';
import { isNotificationsFeatureEnabled } from '..';
import initialRootState from '../../test/initial-root-state';
import useNotificationHandler from '.';

import { INotification } from '@metamask/notification-services-controller/dist/NotificationServicesController/index.cjs';

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

jest.mock('../../../util/notifications', () => ({
  isNotificationsFeatureEnabled: jest.fn(),
}));

const mockNavigate: jest.Mock = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
} as unknown as NavigationProp<ParamListBase>;


const notification = {
  id: 1,
  type: 'metamask_swap_completed',
  data: {
    id: 1,
    trigger_id: '1',
    chain_id: 1,
    block_number: 1,
    block_timestamp: '',
    tx_hash: '',
    unread: false,
    created_at: '',
    address: '',
    type: 'metamask_swap_completed',
    data: {},
    createdAt: '',
    isRead: false,
    action: 'no-tx',
  },
} as unknown as INotification;

describe('useNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  function arrangeHook() {
    const store = arrangeStore();
    const hook = renderHook(() => useNotificationHandler(mockNavigation), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    return hook;
  }

  it('navigates to NOTIFICATIONS.DETAILS when notification is pressed', async () => {

    const { result } = arrangeHook();

    result.current.handlePressedNotification(notification);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.NOTIFICATIONS.DETAILS,
      {
        notificationId: notification.id,
      },
    );
  });

  it('does not navigate if the EventType is DISMISSED', async () => {

    arrangeHook();

    const event = {
      type: EventType.DISMISSED,
      detail: {
        notification,
      },
    };

    await NotificationsService.handleNotificationEvent({
      type: event.type,
      detail: event.detail,
      callback: jest.fn(),
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('handleOpenedNotification does nothing if notification is null', async () => {

    const { result } = arrangeHook();

    result.current.handlePressedNotification();

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});
