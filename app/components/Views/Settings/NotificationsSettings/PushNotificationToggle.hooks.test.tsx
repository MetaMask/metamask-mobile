import { renderHook, act } from '@testing-library/react-hooks';
// eslint-disable-next-line import/no-namespace
import * as PushNotificationsHooks from '../../../../util/notifications/hooks/usePushNotifications';
import { usePushNotificationSettingsToggle } from './PushNotificationToggle.hooks';

describe('usePushNotificationSettingsToggle', () => {
  const arrange = () => {
    const mockTogglePushNotification = jest.fn();

    jest
      .spyOn(PushNotificationsHooks, 'usePushNotificationsToggle')
      .mockReturnValue({
        data: false,
        togglePushNotification: mockTogglePushNotification,
        loading: false,
      });

    const hook = renderHook(() => usePushNotificationSettingsToggle());

    return { hook, mockTogglePushNotification };
  };

  it('toggles the push notification setting', async () => {
    const { hook, mockTogglePushNotification } = arrange();

    await act(async () => {
      hook.result.current.onToggle();
    });

    expect(mockTogglePushNotification).toHaveBeenCalled();
  });
});
