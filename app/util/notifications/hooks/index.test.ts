import { act, renderHook } from '@testing-library/react-hooks';
// eslint-disable-next-line import/no-namespace
import * as constants from '../constants';
import useNotificationHandler from './index';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { Notification } from '../../../util/notifications/types';
import { TRIGGER_TYPES } from '../constants';
import NotificationsService from '../services/NotificationService';

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

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  isNotificationsFeatureEnabled: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
} as unknown as NavigationProp<ParamListBase>;

const notification = {
  id: '123',
  type: TRIGGER_TYPES.ERC1155_RECEIVED,
  data: {
    id: '123',
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

jest.mock('../services/NotificationService', () => ({
  onForegroundEvent: jest.fn(),
  onBackgroundEvent: jest.fn(),
  handleNotificationEvent: jest.fn(),
  onAppBootstrap: jest.fn(),
}));
describe('useNotificationHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to NOTIFICATIONS.DETAILS when notification is pressed', async () => {
    const { result } = renderHook(() => useNotificationHandler(mockNavigation));

    await act(async () => {
      result.current.handlePressedNotification(notification);
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.NOTIFICATIONS.VIEW,
    );
  });

  it('does not navigates when notification is null', async () => {


    const { result } = renderHook(() =>
      useNotificationHandler(mockNavigation),
    );

    await act(async () => {
      result.current.handlePressedNotification();
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('does nothing if the isNotificationsFeatureEnabled is false', async () => {
    jest.spyOn(constants, 'isNotificationsFeatureEnabled').mockReturnValue(false);

    const { result } = renderHook(() => useNotificationHandler(mockNavigation));

    await act(async () => {
      result.current.handlePressedNotification(notification);
    });

    expect(NotificationsService.onForegroundEvent).not.toHaveBeenCalled();
    expect(NotificationsService.onBackgroundEvent).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});
