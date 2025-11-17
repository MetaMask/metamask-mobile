import { renderHook, act } from '@testing-library/react-hooks';
import { Linking } from 'react-native';
// eslint-disable-next-line import/no-namespace
import * as PushNotificationsHooks from '../../../../util/notifications/hooks/usePushNotifications';
// eslint-disable-next-line import/no-namespace
import * as NotificationService from '../../../../util/notifications/services/NotificationService';
import { usePushNotificationSettingsToggle } from './PushNotificationToggle.hooks';

jest.mock('react-native', () => ({
  Linking: {
    openSettings: jest.fn(),
  },
}));

describe('usePushNotificationSettingsToggle', () => {
  const arrange = () => {
    const mockTogglePushNotification = jest.fn();
    const mockGetPushPermission = jest.spyOn(
      NotificationService,
      'getPushPermission',
    );
    jest
      .spyOn(PushNotificationsHooks, 'usePushNotificationsToggle')
      .mockReturnValue({
        data: false,
        togglePushNotification: mockTogglePushNotification,
        loading: false,
      });

    const hook = renderHook(() => usePushNotificationSettingsToggle());

    return { hook, mockTogglePushNotification, mockGetPushPermission };
  };

  it('toggles the push notification setting', async () => {
    const { hook, mockTogglePushNotification, mockGetPushPermission } =
      arrange();
    mockGetPushPermission.mockResolvedValue('authorized');
    await act(async () => {
      hook.result.current.onToggle();
    });

    expect(mockTogglePushNotification).toHaveBeenCalled();
  });

  it('opens settings if permission is denied', async () => {
    const { hook, mockGetPushPermission } = arrange();
    mockGetPushPermission.mockResolvedValue('denied');
    await act(async () => {
      hook.result.current.onToggle();
    });

    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it('does not toggle push notification if permission is denied', async () => {
    const { hook, mockTogglePushNotification, mockGetPushPermission } =
      arrange();
    mockGetPushPermission.mockResolvedValue('denied');
    await act(async () => {
      hook.result.current.onToggle();
    });

    expect(mockTogglePushNotification).not.toHaveBeenCalled();
  });
});
