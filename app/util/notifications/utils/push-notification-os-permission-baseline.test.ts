import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';
import { armPushNotificationOsPermissionBaseline } from './push-notification-os-permission-baseline';

jest.mock('../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../services/NotificationService', () => ({
  isPushPermissionGranted: jest.fn(),
}));

jest.mock('../constants', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../../../selectors/notifications', () => ({
  selectIsMetaMaskPushNotificationsEnabled: jest.fn(),
}));

const mockIsPushPermissionGranted = jest.mocked(isPushPermissionGranted);
const mockIsNotificationsFeatureEnabled = jest.mocked(
  isNotificationsFeatureEnabled,
);
const mockSelectPushEnabled = jest.mocked(
  selectIsMetaMaskPushNotificationsEnabled,
);

const LAST_RESULT_KEY = STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT;

describe('armPushNotificationOsPermissionBaseline', () => {
  const getLastResult = () => mmStorage.getLocal(LAST_RESULT_KEY);

  beforeEach(() => {
    jest.clearAllMocks();
    mmStorage.saveLocal(LAST_RESULT_KEY, false);
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
  });

  it('arms the baseline to true when push is enabled and OS permission is granted', async () => {
    mockSelectPushEnabled.mockReturnValue(true);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await armPushNotificationOsPermissionBaseline();

    expect(getLastResult()).toBe(true);
  });

  it('does not arm when push did not actually get enabled', async () => {
    mockSelectPushEnabled.mockReturnValue(false);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await armPushNotificationOsPermissionBaseline();

    expect(getLastResult()).toBe(false);
  });

  it('does not arm when OS permission is not granted', async () => {
    mockSelectPushEnabled.mockReturnValue(true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await armPushNotificationOsPermissionBaseline();

    expect(getLastResult()).toBe(false);
  });

  it('is a no-op when the notifications feature is disabled', async () => {
    mmStorage.saveLocal(LAST_RESULT_KEY, true);
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);

    await armPushNotificationOsPermissionBaseline();

    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    // Unchanged.
    expect(getLastResult()).toBe(true);
  });

  it('swallows errors from the permission read', async () => {
    mockSelectPushEnabled.mockReturnValue(true);
    mockIsPushPermissionGranted.mockRejectedValue(new Error('boom'));

    await expect(
      armPushNotificationOsPermissionBaseline(),
    ).resolves.toBeUndefined();
  });
});
