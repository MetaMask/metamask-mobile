import { renderHook, act } from '@testing-library/react-hooks';
import notifee, {
  EventType,
  Event as NotifeeEvent,
} from '@notifee/react-native';

import useNotificationHandler from './index';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { Notification } from '../../../util/notifications/types';
import { TRIGGER_TYPES } from '../constants';

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

const notification = {
  id: 1,
  type: TRIGGER_TYPES.ERC1155_RECEIVED,
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
    type: TRIGGER_TYPES.ERC1155_RECEIVED,
    data: {},
    createdAt: '',
    isRead: false,
  },
} as unknown as Notification;

const mockNotificationEvent = (event: NotifeeEvent) => ({
  type: event.type,
  detail: {
    notification,
  },
});

describe('useNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate to NOTIFICATIONS.DETAILS if notification is pressed', async () => {
    const { result } = renderHook(() => useNotificationHandler(mockNavigation));

    await result.current.handlePressedNotification(notification);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.NOTIFICATIONS.DETAILS,
      {
        notificationId: notification.id,
      },
    );
  });

  it('should handle notifications correctly', async () => {
    const { waitFor } = renderHook(() =>
      useNotificationHandler(mockNavigation),
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
      useNotificationHandler(mockNavigation),
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
      useNotificationHandler(mockNavigation),
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
      useNotificationHandler(mockNavigation),
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
      useNotificationHandler(mockNavigation),
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
      useNotificationHandler(mockNavigation),
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
