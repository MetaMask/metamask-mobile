import { renderHook, act } from '@testing-library/react-hooks';
// eslint-disable-next-line import/no-namespace
import * as PushNotificationsHooks from '../../../../util/notifications/hooks/usePushNotifications';
// eslint-disable-next-line import/no-namespace
import * as NotificationService from '../../../../util/notifications/services/NotificationService';
import { usePushNotificationSettingsToggle } from './PushNotificationToggle.hooks';

describe('usePushNotificationSettingsToggle', () => {
  beforeEach(() => jest.resetAllMocks());

  const arrange = () => {
    const mockTogglePushNotification = jest.fn();
    const mockGetPushPermission = jest.spyOn(
      NotificationService,
      'getPushPermission',
    );
    const mockOpenNotificationSettings = jest.spyOn(
      NotificationService.default,
      'openSystemSettings',
    );
    jest
      .spyOn(PushNotificationsHooks, 'usePushNotificationsToggle')
      .mockReturnValue({
        data: false,
        togglePushNotification: mockTogglePushNotification,
        loading: false,
      });

    const hook = renderHook(() => usePushNotificationSettingsToggle());

    return {
      hook,
      mockTogglePushNotification,
      mockGetPushPermission,
      mockOpenNotificationSettings,
    };
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
    const {
      hook,
      mockGetPushPermission,
      mockOpenNotificationSettings,
      mockTogglePushNotification,
    } = arrange();
    mockGetPushPermission.mockResolvedValue('denied');
    await act(async () => {
      hook.result.current.onToggle();
    });

    // Assert - opens settings
    expect(mockOpenNotificationSettings).toHaveBeenCalled();
    // Assert - was not toggled as a user needs to complete settings action
    expect(mockTogglePushNotification).not.toHaveBeenCalled();
  });
});
