import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import { analytics } from '../../analytics/analytics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';
import {
  PUSH_DISABLED_SOURCE_SYSTEM_SETTINGS,
  detectPushNotificationOsPermissionRevocation,
} from './push-notification-os-permission-sync';

jest.mock('../../analytics/analytics', () => ({
  __esModule: true,
  analytics: {
    trackEvent: jest.fn(),
    identify: jest.fn(),
  },
}));

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
const mockTrackEvent = jest.mocked(analytics.trackEvent);
const mockIdentify = jest.mocked(analytics.identify);

const LAST_RESULT_KEY = STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT;

describe('detectPushNotificationOsPermissionRevocation', () => {
  const getLastResult = () => mmStorage.getLocal(LAST_RESULT_KEY);

  beforeEach(() => {
    jest.clearAllMocks();
    mmStorage.saveLocal(LAST_RESULT_KEY, false);
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
    mockSelectPushEnabled.mockReturnValue(true);
  });

  it('does nothing when the notifications feature is disabled', async () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);

    await detectPushNotificationOsPermissionRevocation();

    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('arms the baseline while push is enabled and OS permission is granted', async () => {
    mmStorage.saveLocal(LAST_RESULT_KEY, false);
    mockSelectPushEnabled.mockReturnValue(true);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await detectPushNotificationOsPermissionRevocation();

    expect(getLastResult()).toBe(true);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('fires the disabled event on a granted -> revoked transition', async () => {
    mmStorage.saveLocal(LAST_RESULT_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await detectPushNotificationOsPermissionRevocation();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: MetaMetricsEvents.PUSH_NOTIFICATIONS_DISABLED.category,
        properties: { source: PUSH_DISABLED_SOURCE_SYSTEM_SETTINGS },
      }),
    );
    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: false,
    });
    // Baseline flips to false so a subsequent check stays silent.
    expect(getLastResult()).toBe(false);
  });

  it('does not fire again on a second check while still revoked (dedup)', async () => {
    mmStorage.saveLocal(LAST_RESULT_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await detectPushNotificationOsPermissionRevocation();
    await detectPushNotificationOsPermissionRevocation();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not fire when there was no prior granted baseline', async () => {
    mmStorage.saveLocal(LAST_RESULT_KEY, false);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await detectPushNotificationOsPermissionRevocation();

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(getLastResult()).toBe(false);
  });

  it('does not arm the baseline when OS permission is granted but push is disabled in-app', async () => {
    mmStorage.saveLocal(LAST_RESULT_KEY, false);
    mockSelectPushEnabled.mockReturnValue(false);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await detectPushNotificationOsPermissionRevocation();

    expect(getLastResult()).toBe(false);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('re-arms after permission is granted again, allowing a future revocation to fire', async () => {
    // Revocation fires and disarms.
    mmStorage.saveLocal(LAST_RESULT_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);
    await detectPushNotificationOsPermissionRevocation();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);

    // User re-grants permission with push enabled -> baseline re-arms.
    mockIsPushPermissionGranted.mockResolvedValue(true);
    mockSelectPushEnabled.mockReturnValue(true);
    await detectPushNotificationOsPermissionRevocation();
    expect(getLastResult()).toBe(true);

    // User revokes again -> event fires a second time.
    mockIsPushPermissionGranted.mockResolvedValue(false);
    await detectPushNotificationOsPermissionRevocation();
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('swallows errors from the permission read', async () => {
    mmStorage.saveLocal(LAST_RESULT_KEY, true);
    mockIsPushPermissionGranted.mockRejectedValue(new Error('boom'));

    await expect(
      detectPushNotificationOsPermissionRevocation(),
    ).resolves.toBeUndefined();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
