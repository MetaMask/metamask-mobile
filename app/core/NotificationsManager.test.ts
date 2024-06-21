import NotificationManager from './NotificationManager';

interface NavigationMock {
  navigate: jest.Mock;
}

jest.unmock('./NotificationManager');

const mockNavigate: jest.Mock = jest.fn();
const mockNavigation: NavigationMock = {
  navigate: mockNavigate,
};

const showTransactionNotification = jest.fn();
const hideCurrentNotification = jest.fn();
const showSimpleNotification = jest.fn();
const removeNotificationById = jest.fn();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let notificationManager: any;

describe('NotificationManager', () => {
  beforeEach(() => {
    notificationManager = NotificationManager.init({
      navigation: mockNavigation,
      showTransactionNotification,
      hideCurrentNotification,
      showSimpleNotification,
      removeNotificationById,
    });
  });

  it('calling NotificationManager.init returns an instance of NotificationManager', () => {
    expect(notificationManager).toStrictEqual(notificationManager);
  });

  it('calling NotificationManager in background mode should be truthy', () => {
    notificationManager._handleAppStateChange('background');
    expect(notificationManager._backgroundMode).toBe(true);
  });

  it('calling NotificationManager in background mode OFF should be falsy', () => {
    notificationManager._handleAppStateChange('active');
    expect(notificationManager._backgroundMode).toBe(false);
  });

  it('calling NotificationManager.showSimpleNotification with dada should be truthy', () => {
    expect(
      NotificationManager.showSimpleNotification({
        duration: 5000,
        title: 'Simple Notification',
        description: 'Simple Notification Description',
        action: 'tx',
      }),
    ).toBeTruthy();
  });

  it('calling NotificationManager.getTransactionToView should be falsy if setTransactionToView was not called before', () => {
    expect(NotificationManager.getTransactionToView()).toBeFalsy();
  });

  it('calling NotificationManager.getTransactionToView should be truthy if setTransactionToView was called before', () => {
    NotificationManager.setTransactionToView(1);
    expect(NotificationManager.getTransactionToView()).toBeTruthy();
  });
});
