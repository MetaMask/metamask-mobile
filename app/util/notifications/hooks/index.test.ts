import { renderHook, act } from '@testing-library/react-hooks';
import notifee, { EventType } from '@notifee/react-native';

import useNotificationHandler from './index';
import NotificationManager from '../../../core/NotificationManager';
import Routes from '../../../constants/navigation/Routes';

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

const mockNotificationEvent = ({ type }: { type: any }) => {
  if (type === EventType.PRESS) {
    let data = null;
    data = { action: 'tx', id: '123' };
    if (data && data.action === 'tx') {
      if (data.id) {
        NotificationManager.setTransactionToView(data.id);
      }
      if (mockNavigation) {
        mockNavigation.navigate(Routes.TRANSACTIONS_VIEW);
      }
    }
  }
};

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
      notifee.onForegroundEvent(mockNotificationEvent);
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
      notifee.onForegroundEvent({
        type: EventType.DISMISSED,
        notification: {
          data: {
            action: 'tx',
            id: '123',
          },
        },
      });
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
      notifee.onForegroundEvent({
        type: EventType.DELIVERED,
        notification: {
          data: {
            action: 'no-tx',
            id: '123',
          },
        },
      });
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
      notifee.onForegroundEvent({
        type: EventType.DELIVERED,
        notification: null,
      });
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
      notifee.onForegroundEvent({
        type: EventType.DELIVERED,
        notification: {
          body: 'test',
          data: {
            action: 'tx',
            id: '123',
          },
        },
      });
      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });
    });
  }, 10000);
});
