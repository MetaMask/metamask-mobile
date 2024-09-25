import { renderHook } from '@testing-library/react-hooks';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import NotificationsService from '../../../util/notifications/services/NotificationService';
import Routes from '../../../constants/navigation/Routes';
import { isNotificationsFeatureEnabled } from '../../../util/notifications';
import useNotificationHandler from '.';
import { EventType } from '@notifee/react-native';
import { INotification } from '@metamask/notification-services-controller/dist/NotificationServicesController/index.cjs';

jest.mock('../../../util/notifications/services/NotificationService', () => ({
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  handleNotificationEvent: jest.fn(),
}));

jest.mock('../../../util/notifications', () => ({
  isNotificationsFeatureEnabled: jest.fn(),
}));

const mockNavigation = {
  navigate: jest.fn(),
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
  });

  it('navigates to NOTIFICATIONS.DETAILS if notification is pressed', async () => {
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useNotificationHandler(mockNavigation));

    result.current.handlePressedNotification(notification);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.NOTIFICATIONS.DETAILS,
      {
        notificationId: notification.id,
      },
    );
  });

  it('does nothing if the EventType is DISMISSED', async () => {
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);

    renderHook(() => useNotificationHandler(mockNavigation));

    const event = {
      type: EventType.DISMISSED,
      detail: {
        notification,
      },
    };

    const callback = (NotificationsService.onForegroundEvent as jest.Mock).mock
      .calls[0][0];
    await callback(event);

    expect(NotificationsService.handleNotificationEvent).toHaveBeenCalledWith({
      type: event.type,
      detail: event.detail,
      callback: expect.any(Function),
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('handleOpenedNotification does nothing if notification is null', async () => {
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useNotificationHandler(mockNavigation));

    result.current.handlePressedNotification();

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('processes notification on Android', async () => {
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);

    renderHook(() => useNotificationHandler(mockNavigation));

    const event = {
      type: EventType.DELIVERED,
      detail: {
        notification,
      },
    };

    const callback = (NotificationsService.onBackgroundEvent as jest.Mock).mock
      .calls[0][0];
    await callback(event);

    expect(NotificationsService.handleNotificationEvent).toHaveBeenCalledWith({
      type: event.type,
      detail: event.detail,
      callback: expect.any(Function),
    });

    const handleNotificationCallback = (
      NotificationsService.handleNotificationEvent as jest.Mock
    ).mock.calls[0][0].callback;
    await handleNotificationCallback(event.detail.notification);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.NOTIFICATIONS.DETAILS,
      {
        notificationId: notification.id,
      },
    );
  });
});
