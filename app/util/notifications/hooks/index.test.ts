import { renderHook, act } from '@testing-library/react-hooks';
import useNotificationHandler from './index';
import notifee, { EventType } from '@notifee/react-native';
import NotificationManager from '../../../core/NotificationManager';
import Routes from '../../../constants/navigation/Routes';

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
  let bootstrapAndroidInitialNotification: () => Promise<void>;
  let navigation: any;

  beforeEach(() => {
    bootstrapAndroidInitialNotification = jest
      .fn()
      .mockResolvedValue(
        Promise.resolve((resolve: any) => setTimeout(resolve, 1)),
      );
    navigation = { navigate: jest.fn() };
  });

  it('should handle notifications correctly', async () => {
    const mockNotificationEvent = ({ type }: { type: any }) => {
      if (type !== EventType.DISMISSED) {
        let data = null;
        data = { action: 'tx', id: '123' };
        if (data && data.action === 'tx') {
          if (data.id) {
            NotificationManager.setTransactionToView(data.id);
          }
          if (navigation) {
            navigation.navigate(Routes.TRANSACTIONS_VIEW);
          }
        }
      }
    };

    const { waitFor } = renderHook(() =>
      useNotificationHandler(bootstrapAndroidInitialNotification, navigation),
    );

    await act(async () => {
      notifee.onForegroundEvent(mockNotificationEvent);
      await waitFor(() => {
        expect(notifee.onForegroundEvent).toHaveBeenCalled();
      });
    });
  });
});
