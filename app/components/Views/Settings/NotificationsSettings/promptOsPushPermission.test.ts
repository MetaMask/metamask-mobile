import NotificationService, {
  isPushPermissionGranted,
  isPushPermissionPromptable,
  requestPushPermissions,
} from '../../../../util/notifications/services/NotificationService';
import { promptOsPushPermissionIfNeeded } from './promptOsPushPermission';

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { requestPushNotificationsPermission: jest.fn() },
    isPushPermissionGranted: jest.fn(),
    isPushPermissionPromptable: jest.fn(),
    requestPushPermissions: jest.fn(),
  }),
);

describe('promptOsPushPermissionIfNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true without prompting when permission is already granted', async () => {
    jest.mocked(isPushPermissionGranted).mockResolvedValue(true);

    await expect(promptOsPushPermissionIfNeeded()).resolves.toBe(true);

    expect(isPushPermissionPromptable).not.toHaveBeenCalled();
    expect(requestPushPermissions).not.toHaveBeenCalled();
    expect(
      NotificationService.requestPushNotificationsPermission,
    ).not.toHaveBeenCalled();
  });

  it('requests OS permission when it is promptable', async () => {
    jest
      .mocked(isPushPermissionGranted)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    jest.mocked(isPushPermissionPromptable).mockResolvedValue(true);
    jest.mocked(requestPushPermissions).mockResolvedValue(true);

    await expect(promptOsPushPermissionIfNeeded()).resolves.toBe(true);

    expect(requestPushPermissions).toHaveBeenCalledTimes(1);
    expect(
      NotificationService.requestPushNotificationsPermission,
    ).not.toHaveBeenCalled();
  });

  it('opens the Settings alert when the OS permission is no longer promptable', async () => {
    jest.mocked(isPushPermissionGranted).mockResolvedValue(false);
    jest.mocked(isPushPermissionPromptable).mockResolvedValue(false);
    jest
      .mocked(NotificationService.requestPushNotificationsPermission)
      .mockResolvedValue(undefined);

    await expect(promptOsPushPermissionIfNeeded()).resolves.toBe(false);

    expect(
      NotificationService.requestPushNotificationsPermission,
    ).toHaveBeenCalledTimes(1);
    expect(requestPushPermissions).not.toHaveBeenCalled();
  });
});
