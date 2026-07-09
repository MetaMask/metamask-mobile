import React from 'react';
import { Provider } from 'react-redux';
import { act, render } from '@testing-library/react-native';
import Notification from './index';
import configureStore from '../../../util/test/configureStore';
import { NotificationTypes } from '../../../util/notifications';
import { ACTIONS } from '../../../reducers/notification';

function mockNotificationChild(testID) {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return function MockNotification(props) {
    return ReactMock.createElement(View, {
      testID,
      onDismissComplete: props.onDismissComplete,
    });
  };
}

jest.mock('./TransactionNotification', () =>
  mockNotificationChild('transaction-notification'),
);
jest.mock('./SimpleNotification', () =>
  mockNotificationChild('simple-notification'),
);

const createNotificationState = (notification) => ({
  notification: {
    notifications: notification ? [notification] : [],
  },
});

const renderNotification = (notification) => {
  const store = configureStore(createNotificationState(notification));
  const dispatchSpy = jest.spyOn(store, 'dispatch');

  const view = render(
    <Provider store={store}>
      <Notification />
    </Provider>,
  );

  return { ...view, dispatchSpy, store };
};

const simpleNotification = {
  type: NotificationTypes.SIMPLE,
  isVisible: true,
  status: 'success',
  title: 'Test title',
  description: 'Test description',
};

describe('Notification', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'transaction',
      {
        type: NotificationTypes.TRANSACTION,
        isVisible: true,
        status: 'pending',
      },
      'transaction-notification',
    ],
    [
      'simple',
      {
        type: NotificationTypes.SIMPLE,
        isVisible: true,
        status: 'success',
        title: 'Test title',
        description: 'Test description',
      },
      'simple-notification',
    ],
  ])('renders %s notifications', (_, notification, testId) => {
    const { getByTestId } = renderNotification(notification);

    expect(getByTestId(testId)).toBeOnTheScreen();
  });

  it.each([
    ['no notification type', { isVisible: true }],
    ['unsupported notification type', { type: 'unsupported', isVisible: true }],
  ])('renders nothing for %s', (_, notification) => {
    const { queryByTestId } = renderNotification(notification);

    expect(queryByTestId('transaction-notification')).not.toBeOnTheScreen();
    expect(queryByTestId('simple-notification')).not.toBeOnTheScreen();
  });

  it('dispatches hide and remove actions when the component unmounts', () => {
    const { unmount, dispatchSpy } = renderNotification(simpleNotification);

    unmount();

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: ACTIONS.HIDE_CURRENT_NOTIFICATION,
    });
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: ACTIONS.REMOVE_CURRENT_NOTIFICATION,
    });
  });

  it('dequeues the current notification when the fallback timer expires', () => {
    jest.useFakeTimers();
    const { dispatchSpy } = renderNotification({
      id: 'notification-1',
      ...simpleNotification,
      autodismiss: 1000,
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: ACTIONS.REMOVE_CURRENT_NOTIFICATION,
    });
    jest.useRealTimers();
  });

  it('dequeues only once when dismiss complete is invoked twice', () => {
    jest.useFakeTimers();
    const { getByTestId, dispatchSpy } = renderNotification({
      id: 'notification-1',
      ...simpleNotification,
      autodismiss: 1000,
    });

    const notification = getByTestId('simple-notification');

    act(() => {
      notification.props.onDismissComplete();
      notification.props.onDismissComplete();
      jest.advanceTimersByTime(2000);
    });

    expect(
      dispatchSpy.mock.calls.filter(
        ([action]) => action.type === ACTIONS.REMOVE_CURRENT_NOTIFICATION,
      ),
    ).toHaveLength(1);
    jest.useRealTimers();
  });
});
