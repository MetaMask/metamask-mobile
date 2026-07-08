import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import Notification from './index';
import configureStore from '../../../util/test/configureStore';
import { NotificationTypes } from '../../../util/notifications';
import { ACTIONS } from '../../../reducers/notification';

jest.mock('./TransactionNotification', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return function MockTransactionNotification() {
    return ReactMock.createElement(View, {
      testID: 'transaction-notification',
    });
  };
});

jest.mock('./SimpleNotification', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return function MockSimpleNotification() {
    return ReactMock.createElement(View, { testID: 'simple-notification' });
  };
});

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

describe('Notification', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there is no current notification type', () => {
    const { queryByTestId } = renderNotification({ isVisible: true });

    expect(queryByTestId('transaction-notification')).not.toBeOnTheScreen();
    expect(queryByTestId('simple-notification')).not.toBeOnTheScreen();
  });

  it('renders TransactionNotification for transaction notifications', () => {
    const { getByTestId } = renderNotification({
      type: NotificationTypes.TRANSACTION,
      isVisible: true,
      status: 'pending',
    });

    expect(getByTestId('transaction-notification')).toBeOnTheScreen();
  });

  it('renders SimpleNotification for simple notifications', () => {
    const { getByTestId } = renderNotification({
      type: NotificationTypes.SIMPLE,
      isVisible: true,
      status: 'success',
      title: 'Test title',
      description: 'Test description',
    });

    expect(getByTestId('simple-notification')).toBeOnTheScreen();
  });

  it('renders nothing for an unsupported notification type', () => {
    const { queryByTestId } = renderNotification({
      type: 'unsupported',
      isVisible: true,
    });

    expect(queryByTestId('transaction-notification')).not.toBeOnTheScreen();
    expect(queryByTestId('simple-notification')).not.toBeOnTheScreen();
  });

  it('dispatches hide and remove actions when the component unmounts', () => {
    const { unmount, dispatchSpy } = renderNotification({
      type: NotificationTypes.SIMPLE,
      isVisible: true,
      status: 'success',
      title: 'Test title',
      description: 'Test description',
    });

    unmount();

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: ACTIONS.HIDE_CURRENT_NOTIFICATION,
    });
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: ACTIONS.REMOVE_CURRENT_NOTIFICATION,
    });
  });
});
