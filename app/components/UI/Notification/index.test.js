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

const simpleNotification = {
  type: NotificationTypes.SIMPLE,
  isVisible: true,
  status: 'success',
  title: 'Test title',
  description: 'Test description',
};

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

  it('dequeues only once when unmounting after dismiss complete', () => {
    const { getByTestId, unmount, dispatchSpy } =
      renderNotification(simpleNotification);

    act(() => {
      getByTestId('simple-notification').props.onDismissComplete();
    });

    unmount();

    expect(
      dispatchSpy.mock.calls.filter(
        ([action]) => action.type === ACTIONS.REMOVE_CURRENT_NOTIFICATION,
      ),
    ).toHaveLength(1);
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

  it('restarts the fallback timer when notification status changes', () => {
    jest.useFakeTimers();
    const { dispatchSpy, rerender, store } = renderNotification({
      id: 'notification-1',
      ...simpleNotification,
      status: 'pending',
      autodismiss: 1000,
    });

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    act(() => {
      store.dispatch({
        type: ACTIONS.MODIFY_OR_SHOW_SIMPLE_NOTIFICATION,
        id: 'notification-1',
        status: 'success',
        title: simpleNotification.title,
        description: simpleNotification.description,
        autodismiss: 1000,
      });
    });

    rerender(
      <Provider store={store}>
        <Notification />
      </Provider>,
    );

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(
      dispatchSpy.mock.calls.filter(
        ([action]) => action.type === ACTIONS.REMOVE_CURRENT_NOTIFICATION,
      ),
    ).toHaveLength(0);

    act(() => {
      jest.advanceTimersByTime(600);
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
