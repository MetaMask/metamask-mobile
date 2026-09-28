import { MetaMetricsEvents } from '../../../core/Analytics';
import Engine from '../../../core/Engine';
import { analytics } from '../../analytics/analytics';
import { UserProfileProperty } from '../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { isNotificationsFeatureEnabled } from '../constants';
import { isPushPermissionGranted } from '../services/NotificationService';
import { mmStorage } from '../settings';
import { STORAGE_IDS } from '../settings/storage/constants';
import { syncPushNotificationOsPermission } from './push-notification-os-permission-sync';

jest.mock('../../analytics/analytics', () => ({
  __esModule: true,
  analytics: {
    trackEvent: jest.fn(),
    identify: jest.fn(),
  },
}));

jest.mock('../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NotificationServicesController: {
        state: { isNotificationServicesEnabled: false },
      },
    },
  },
}));

jest.mock('../services/NotificationService', () => ({
  isPushPermissionGranted: jest.fn(),
}));

jest.mock('../constants', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

const mockIsPushPermissionGranted = jest.mocked(isPushPermissionGranted);
const mockIsNotificationsFeatureEnabled = jest.mocked(
  isNotificationsFeatureEnabled,
);
const mockTrackEvent = jest.mocked(analytics.trackEvent);
const mockIdentify = jest.mocked(analytics.identify);

const setNotificationsEnabled = (value: boolean) => {
  (
    Engine.context.NotificationServicesController.state as {
      isNotificationServicesEnabled: boolean;
    }
  ).isNotificationServicesEnabled = value;
};

const STORED_STATE_KEY = STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT;

describe('syncPushNotificationOsPermission', () => {
  const getStoredState = () => mmStorage.getLocal(STORED_STATE_KEY);

  const expectDisabledEventCount = (count: number) => {
    expect(mockTrackEvent).toHaveBeenCalledTimes(count);
    if (count > 0) {
      expect(mockTrackEvent.mock.calls[count - 1][0]).toEqual(
        expect.objectContaining({
          name: MetaMetricsEvents.PUSH_NOTIFICATIONS_DISABLED.category,
          properties: {},
        }),
      );
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mmStorage.saveLocal(STORED_STATE_KEY, false);
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
    setNotificationsEnabled(true);
  });

  it('does nothing when the notifications feature is disabled', async () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);

    await syncPushNotificationOsPermission();

    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('fires the disabled event when OS permission is revoked', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();

    expectDisabledEventCount(1);
    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: false,
    });
    expect(getStoredState()).toBe(false);
  });

  it('restores the profile trait when OS permission is granted', async () => {
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await syncPushNotificationOsPermission();

    expect(getStoredState()).toBe(true);
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
    });
  });

  it('does not report anything when the permission is unchanged', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await syncPushNotificationOsPermission();

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('does not fire again while still revoked', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();
    await syncPushNotificationOsPermission();

    expectDisabledEventCount(1);
  });

  it('fires again on every revocation, without needing push to be re-enabled in-app', async () => {
    // The Android path: revoking permission kills the process and Engine
    // force-disables isPushEnabled on the next launch without ever restoring
    // it. Tracking the OS permission alone means the second revocation is
    // still reported.
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);
    await syncPushNotificationOsPermission();
    expectDisabledEventCount(1);

    mockIsPushPermissionGranted.mockResolvedValue(true);
    await syncPushNotificationOsPermission();
    expect(getStoredState()).toBe(true);
    expect(mockIdentify).toHaveBeenLastCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
    });

    mockIsPushPermissionGranted.mockResolvedValue(false);
    await syncPushNotificationOsPermission();
    expectDisabledEventCount(2);
  });

  it('does not report while the user has notifications switched off, but keeps tracking the permission', async () => {
    setNotificationsEnabled(false);
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
    // Tracked anyway, so re-enabling notifications later does not replay this
    // revocation as if it had just happened.
    expect(getStoredState()).toBe(false);

    setNotificationsEnabled(true);
    await syncPushNotificationOsPermission();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('serializes overlapping calls so a revocation fires only once', async () => {
    // Mirrors mount + background->active firing close together: without
    // serialization both runs would read the stored `true` before either
    // persists `false` and emit duplicate events.
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await Promise.all([
      syncPushNotificationOsPermission(),
      syncPushNotificationOsPermission(),
    ]);

    expectDisabledEventCount(1);
    expect(getStoredState()).toBe(false);
  });

  it('does not fire when permission was already revoked on the previous check', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, false);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(getStoredState()).toBe(false);
  });

  it('swallows errors from the permission read', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockRejectedValue(new Error('boom'));

    await expect(syncPushNotificationOsPermission()).resolves.toBeUndefined();
    expect(mockTrackEvent).not.toHaveBeenCalled();
    // Nothing persisted, so the revocation is still detectable on the next run.
    expect(getStoredState()).toBe(true);
  });
});
