import { renderHook, act } from '@testing-library/react-hooks';
import useNotificationHandler from './index';
import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import { STORAGE_IDS } from '../../../util/notifications/settings/storage/constants';
import NotificationManager from '../../../core/NotificationManager';

jest.mock('@notifee/react-native');
jest.mock('../../../util/device');
jest.mock('../../../core/NotificationManager');

describe('useNotificationHandler', () => {
  it('should handle notifications correctly', async () => {
    const bootstrapInitialNotification = jest
      .fn()
      .mockResolvedValue(Promise.resolve());
    const navigation = { navigate: jest.fn() };

    const { waitForNextUpdate } = renderHook(() =>
      useNotificationHandler(bootstrapInitialNotification, navigation),
    );

    await waitForNextUpdate();

    expect(bootstrapInitialNotification).toHaveBeenCalled();
    expect(notifee.decrementBadgeCount).toHaveBeenCalledWith(1);
    expect(notifee.onForegroundEvent).toHaveBeenCalled();
    expect(notifee.createChannel).toHaveBeenCalledWith({
      id: STORAGE_IDS.ANDROID_DEFAULT_CHANNEL_ID,
      name: 'Default',
      importance: AndroidImportance.HIGH,
    });

    // Simulate a notification event
    const mockNotificationEvent = {
      type: EventType.DELIVERED,
      detail: {
        notification: {
          data: JSON.stringify({ action: 'tx', id: '123' }),
        },
      },
    };

    act(() => {
      notifee.onForegroundEvent.mock.calls[0][0](mockNotificationEvent);
    });

    expect(NotificationManager.setTransactionToView).toHaveBeenCalledWith(
      '123',
    );
    expect(navigation.navigate).toHaveBeenCalledWith('TransactionsView');
  });
});
