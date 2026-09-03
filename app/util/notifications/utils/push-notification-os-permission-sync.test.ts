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
      NotificationServicesPushController: { state: { isPushEnabled: false } },
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

const setControllerPushEnabled = (value: boolean) => {
  (
    Engine.context.NotificationServicesPushController.state as {
      isPushEnabled: boolean;
    }
  ).isPushEnabled = value;
};

const STORED_STATE_KEY = STORAGE_IDS.PUSH_OS_PERMISSION_GRANTED_LAST_RESULT;

describe('syncPushNotificationOsPermission', () => {
  const getStoredState = () => mmStorage.getLocal(STORED_STATE_KEY);

  beforeEach(() => {
    jest.clearAllMocks();
    mmStorage.saveLocal(STORED_STATE_KEY, false);
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
    setControllerPushEnabled(true);
  });

  it('does nothing when the notifications feature is disabled', async () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);

    await syncPushNotificationOsPermission();

    expect(mockIsPushPermissionGranted).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('stores the enabled state and restores the profile trait when push is enabled and OS permission is granted', async () => {
    setControllerPushEnabled(true);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await syncPushNotificationOsPermission();

    expect(getStoredState()).toBe(true);
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
    });
  });

  it('does not store the enabled state when push is disabled in-app', async () => {
    setControllerPushEnabled(false);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await syncPushNotificationOsPermission();

    expect(getStoredState()).toBe(false);
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('does not store the enabled state when OS permission is not granted', async () => {
    setControllerPushEnabled(true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();

    expect(getStoredState()).toBe(false);
    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('fires the disabled event on an OS permission granted -> revoked transition', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: MetaMetricsEvents.PUSH_NOTIFICATIONS_DISABLED.category,
        properties: {},
      }),
    );
    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: false,
    });
    // Snapshot flips to false so a subsequent check stays silent.
    expect(getStoredState()).toBe(false);
  });

  it('does not fire the disabled event on an in-app disable, and clears the stored state', async () => {
    // Enabled + granted, then the user turns push off in-app (the disable
    // helper syncs after the controller call).
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    setControllerPushEnabled(false);
    mockIsPushPermissionGranted.mockResolvedValue(true);

    await syncPushNotificationOsPermission();

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
    expect(getStoredState()).toBe(false);

    // A later OS-level revocation must not be misreported: the stored state is
    // already false, so nothing fires.
    mockIsPushPermissionGranted.mockResolvedValue(false);
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

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(getStoredState()).toBe(false);
  });

  it('does not fire again on a second check while still revoked (dedup)', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();
    await syncPushNotificationOsPermission();

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('does not fire when there was no prior stored enabled state', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, false);
    mockIsPushPermissionGranted.mockResolvedValue(false);

    await syncPushNotificationOsPermission();

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(getStoredState()).toBe(false);
  });

  it('restores the profile trait and re-arms after permission is granted again, allowing a future revocation to fire', async () => {
    // Revocation fires and clears the stored state.
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockResolvedValue(false);
    await syncPushNotificationOsPermission();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockIdentify).toHaveBeenLastCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: false,
    });

    // User re-grants permission with push enabled -> trait restored.
    mockIsPushPermissionGranted.mockResolvedValue(true);
    setControllerPushEnabled(true);
    await syncPushNotificationOsPermission();
    expect(getStoredState()).toBe(true);
    expect(mockIdentify).toHaveBeenLastCalledWith({
      [UserProfileProperty.PUSH_NOTIFICATIONS_ENABLED]: true,
    });

    // User revokes again -> event fires a second time.
    mockIsPushPermissionGranted.mockResolvedValue(false);
    await syncPushNotificationOsPermission();
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('swallows errors from the permission read', async () => {
    mmStorage.saveLocal(STORED_STATE_KEY, true);
    mockIsPushPermissionGranted.mockRejectedValue(new Error('boom'));

    await expect(syncPushNotificationOsPermission()).resolves.toBeUndefined();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
