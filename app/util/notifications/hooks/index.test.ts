import { renderHook, act } from '@testing-library/react-hooks';
import notifee, {
  EventType,
  Event as NotifeeEvent,
} from '@notifee/react-native';

import useNotificationHandler from './index';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import NotificationManager from '../../../core/NotificationManager';

jest.mock('../../../util/device');
jest.mock('../../../core/NotificationManager', () => ({
  setTransactionToView: jest.fn(),
}));
jest.mock('@notifee/react-native', () => ({
  setBadgeCount: jest.fn(),
  decrementBadgeCount: jest.fn(),
  onForegroundEvent: jest.fn(),
  createChannel: jest.fn(),
  EventType: {
    DISMISSED: 'dismissed',
    DELIVERED: 'delivered',
    PRESS: 'press',
  },
  AndroidImportance: {
    HIGH: 'high',
  },
}));

jest.mock('../../../core/NotificationManager', () => ({
  setTransactionToView: jest.fn(),
}));

jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as NavigationProp<ParamListBase>;

const bootstrapAndroidInitialNotification = jest
  .fn()
  .mockResolvedValue(undefined);

const mockNotificationEvent = (event: NotifeeEvent) => ({
  type: event.type,
  detail: {
    notification: {
      body: 'notificationTest',
      data: {
        action: 'tx',
        id: '123',
      },
    },
  },
});
describe('useNotificationHandler', () => {
  const mockBootstrapAndroidInitialNotification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to TRANSACTIONS_VIEW if notification action is tx', async () => {
    const notification = {
      data: {
        action: 'tx',
        id: '123',
      },
    };

    const { result } = renderHook(() =>
      useNotificationHandler(
        mockBootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await result.current.performActionBasedOnOpenedNotificationType(
      notification,
    );

    expect(NotificationManager.setTransactionToView).toHaveBeenCalledWith(
      '123',
    );
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.TRANSACTIONS_VIEW,
    );
  });

  it('should navigate to NOTIFICATIONS.VIEW if notification action is not tx', async () => {
    const notification = {
      data: {
        action: 'other',
      },
    };

    const { result } = renderHook(() =>
      useNotificationHandler(
        mockBootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await result.current.performActionBasedOnOpenedNotificationType(
      notification,
    );

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.NOTIFICATIONS.VIEW,
    );
  });

  it('should handle opened notification', async () => {
    const notification = {
      data: {
        action: 'tx',
        id: '123',
      },
    };

    const { result } = renderHook(() =>
      useNotificationHandler(
        mockBootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await result.current.handleOpenedNotification(notification);

    expect(NotificationManager.setTransactionToView).toHaveBeenCalledWith(
      '123',
    );
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.TRANSACTIONS_VIEW,
    );
  });

  it('should handle notification pressed event', async () => {
    const event = {
      type: EventType.PRESS,
      detail: {
        notification: {
          data: {
            action: 'tx',
            id: '123',
          },
        },
      },
    };

    const { result } = renderHook(() =>
      useNotificationHandler(
        mockBootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await result.current.handleNotificationPressed(event);

    expect(NotificationManager.setTransactionToView).toHaveBeenCalledWith(
      '123',
    );
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.TRANSACTIONS_VIEW,
    );
  });

  it('sets initial badge count and initializes Android notifications on mount', async () => {
    renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    expect(bootstrapAndroidInitialNotification).toHaveBeenCalled();

    jest.runAllTimers();
  });

  it('should handle notifications correctly', async () => {
    const { waitFor } = renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await act(async () => {
      notifee.onForegroundEvent(() =>
        mockNotificationEvent({
          type: EventType.PRESS,
          detail: {
            notification: {
              body: 'notificationTest',
              data: {
                action: 'tx',
                id: '123',
              },
            },
          },
        }),
      );
      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });
    });
  });

  it('should do nothing if the EventType is DISMISSED', async () => {
    const { waitFor } = renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await act(async () => {
      notifee.onForegroundEvent(() =>
        mockNotificationEvent({
          type: EventType.DISMISSED,
          detail: {
            notification: {
              body: 'notificationTest',
              data: {
                action: 'tx',
                id: '123',
              },
            },
          },
        }),
      );

      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });
    });
  });

  it('should do nothing if data.action is not tx', async () => {
    const { waitFor } = renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await act(async () => {
      notifee.onForegroundEvent(() =>
        mockNotificationEvent({
          type: EventType.DELIVERED,
          detail: {
            notification: {
              body: 'notificationTest',
              data: {
                action: 'no-tx',
                id: '123',
              },
            },
          },
        }),
      );

      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('handleOpenedNotification should do nothing if notification is null', async () => {
    const { waitFor } = renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await act(async () => {
      notifee.onForegroundEvent(() =>
        mockNotificationEvent({
          type: EventType.DELIVERED,
          detail: {
            notification: undefined,
          },
        }),
      );
      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('should navigate to the transaction view when the notification action is "tx"', async () => {
    const { waitFor } = renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await act(async () => {
      notifee.onForegroundEvent(() =>
        mockNotificationEvent({
          type: EventType.DELIVERED,
          detail: {
            notification: {
              body: 'notificationTest',
              data: {
                action: 'tx',
                id: '123',
              },
            },
          },
        }),
      );
      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });
    });
  }, 10000);

  it('should process notification on Android', async () => {
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      OS: 'android',
    }));

    const { waitFor } = renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    await act(async () => {
      notifee.onForegroundEvent(() =>
        mockNotificationEvent({
          type: EventType.PRESS,
          detail: {
            notification: {
              body: 'notificationTest',
              data: {
                action: 'tx',
                id: '123',
              },
            },
          },
        }),
      );
      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });
    });
  });
});
