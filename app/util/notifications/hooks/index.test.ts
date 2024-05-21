import { renderHook, act } from '@testing-library/react-hooks';
import notifee, {
  EventType,
  Event as NotifeeEvent,
} from '@notifee/react-native';

import useNotificationHandler from './index';

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

interface NavigationMock {
  navigate: jest.Mock;
}

const mockNavigate: jest.Mock = jest.fn();
const mockNavigation: NavigationMock = {
  navigate: mockNavigate,
};
const bootstrapAndroidInitialNotification = jest
  .fn()
  .mockResolvedValue(Promise.resolve((resolve: any) => setTimeout(resolve, 1)));

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets initial badge count and initializes Android notifications on mount', async () => {
    renderHook(() =>
      useNotificationHandler(
        bootstrapAndroidInitialNotification,
        mockNavigation,
      ),
    );

    expect(notifee.setBadgeCount).toHaveBeenCalledWith(0);
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
