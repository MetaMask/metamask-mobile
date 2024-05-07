import { renderHook, act } from '@testing-library/react-hooks';
import useNotificationHandler from './index';
import notifee, { EventType } from '@notifee/react-native';
import NotificationManager from '../../../core/NotificationManager';

jest.mock('../../../util/device');
jest.mock('../../../core/NotificationManager');
jest.mock('@notifee/react-native', () => ({
  decrementBadgeCount: jest.fn(),
  onForegroundEvent: jest.fn(),
  createChannel: jest.fn(),
  EventType: {
    DISMISSED: 'dismissed',
    DELIVERED: 'delivered',
  },
  AndroidImportance: {
    HIGH: 'high',
  },
}));

describe('useNotificationHandler', () => {
  it('should handle notifications correctly', async () => {
    const bootstrapAndroidInitialNotification = jest
      .fn()
      .mockResolvedValue(
        Promise.resolve((resolve: any) => setTimeout(resolve, 1)),
      );
    const navigation = { navigate: jest.fn() };

    const { waitFor } = renderHook(() =>
      useNotificationHandler(bootstrapAndroidInitialNotification, navigation),
    );

    await act(async () => {
      await waitFor(() => {
        expect(bootstrapAndroidInitialNotification).toHaveBeenCalled();
      });
    });

    const mockNotificationEvent = ({ type }: { type: any }) => {
      if (type !== EventType.DISMISSED) {
        let data = null;
        data = { action: 'tx', id: '123' };
        if (data && data.action === 'tx') {
          if (data.id) {
            NotificationManager.setTransactionToView(data.id);
          }
          if (navigation) {
            navigation.navigate('TransactionsView');
          }
        }
      }
    };

    await act(async () => {
      notifee.onForegroundEvent(mockNotificationEvent);
      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });
    });
  });
});
