import { maybePromptPushPermissionAfterCliLogin } from './promptPushNotificationPermission';

const mockIsNotificationsFeatureEnabled = jest.fn();
const mockGetPushPermissionStatus = jest.fn();
const mockEmit = jest.fn();
const mockSelectIsMetamaskNotificationsEnabled = jest.fn();
const mockSelectIsMetaMaskPushNotificationsEnabled = jest.fn();
const mockGetState = jest.fn();

jest.mock('../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: () => mockIsNotificationsFeatureEnabled(),
}));

jest.mock('../../util/notifications/services/NotificationService', () => ({
  getPushPermissionStatus: () => mockGetPushPermissionStatus(),
}));

jest.mock('../../store', () => ({
  store: {
    getState: () => mockGetState(),
  },
}));

jest.mock('../../selectors/notifications', () => ({
  selectIsMetamaskNotificationsEnabled: (state: unknown) =>
    mockSelectIsMetamaskNotificationsEnabled(state),
  selectIsMetaMaskPushNotificationsEnabled: (state: unknown) =>
    mockSelectIsMetaMaskPushNotificationsEnabled(state),
}));

jest.mock('./cliLoginPushNudgeSignal', () => ({
  emitCliLoginPushNudge: () => mockEmit(),
}));

jest.mock('../SDKConnectV2/services/logger', () => ({
  __esModule: true,
  default: { warn: jest.fn() },
}));

describe('maybePromptPushPermissionAfterCliLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
    mockGetPushPermissionStatus.mockResolvedValue('promptable');
    mockGetState.mockReturnValue({});
    mockSelectIsMetamaskNotificationsEnabled.mockReturnValue(true);
    mockSelectIsMetaMaskPushNotificationsEnabled.mockReturnValue(false);
  });

  it('bails when the notifications feature is disabled', async () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);

    await maybePromptPushPermissionAfterCliLogin();

    expect(mockGetPushPermissionStatus).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('does nothing when in-app, native, and push registration are all enabled', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('granted');
    mockSelectIsMetamaskNotificationsEnabled.mockReturnValue(true);
    mockSelectIsMetaMaskPushNotificationsEnabled.mockReturnValue(true);

    await maybePromptPushPermissionAfterCliLogin();

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('emits when native permission is granted but MetaMask in-app notifications are off', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('granted');
    mockSelectIsMetamaskNotificationsEnabled.mockReturnValue(false);
    mockSelectIsMetaMaskPushNotificationsEnabled.mockReturnValue(true);

    await maybePromptPushPermissionAfterCliLogin();

    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('emits the nudge signal when native push is promptable', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('promptable');

    await maybePromptPushPermissionAfterCliLogin();

    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('emits the nudge signal when native permission was previously denied', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('denied');

    await maybePromptPushPermissionAfterCliLogin();

    expect(mockEmit).toHaveBeenCalledTimes(1);
  });

  it('re-emits the nudge on every eligible CLI login', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('promptable');
    mockSelectIsMetamaskNotificationsEnabled.mockReturnValue(false);

    await maybePromptPushPermissionAfterCliLogin();
    await maybePromptPushPermissionAfterCliLogin();

    expect(mockEmit).toHaveBeenCalledTimes(2);
  });

  it('never rejects when the permission status lookup throws', async () => {
    mockGetPushPermissionStatus.mockRejectedValue(new Error('status boom'));

    await expect(
      maybePromptPushPermissionAfterCliLogin(),
    ).resolves.toBeUndefined();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
